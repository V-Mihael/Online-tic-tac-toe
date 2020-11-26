const io = require('socket.io')()

const maxRooms = 32     // maximo de salas concorrentemente
let usersData = []      // lista de usuarios conectados e seus socket.id's
let games = []          // lista de jogos correntes. Mantem informacao das jogadas para verificar fim de jogo
let roomsControl = []   // lista binaria de controle de salas disponiveis: 1 = sala ocupada
let roomCounter = 0     // contador para a proxima sala. Funciona com fila circular


// funcao construtora de usuario
const userAdd = function (name, ID) {
    let user = {
        username: name,
        socketID: ID
    }
    return user
}

io.on('connection', (socket) => {
    let myusername, invited, inviter    // variaveis quase globais

    // eventos de socket
    socket.on('authentication', (data) => {
        authenticate(data, function (err, message) {
            if (err) {
                console.log(err)
                socket.emit('unauthorized', message)
                socket.disconnect(0);
            }
            else {
                socket.emit('authenticated', usersData)
                usersData.push(userAdd(data.username, socket.id));
                io.to('/validados').emit('newUser', data.username);
                socket.join('/validados');
                myusername = data.username
            }
        }.bind(this));
    })

    socket.on('gameInvite', (data) => {
        invited = data.invited
        inviter = data.inviter
        let invitedUser = usersData.find((item) => item.username == invited)
        io.to(invitedUser.socketID).emit('gameInvite', inviter)
    })

    socket.on('disconnect', function () {
        const index = usersData.findIndex(element => element.username == myusername)
        if (index > -1) {
            usersData.splice(index, 1)
            io.to('/validados').emit('userLeaved', myusername)
            socket.leaveAll()
        }
    });

    socket.on('acceptGame', (data) => {
        inviter = data
        invited = myusername
        let inviterUser = usersData.find((item) => item.username == inviter)
        while (roomsControl[roomCounter] == 1) {
            roomCounter = (roomCounter + 1) % maxRooms
        }
        socket.join(roomCounter)
        games[roomCounter] = { casa1: -1, casa2: -1, casa3: -1, casa4: -1, casa5: -1, casa6: -1, casa7: -1, casa8: -1, casa9: -1 }
        socket.emit('msg', 'Você entrou na sala ' + roomCounter, roomCounter)
        io.to(inviterUser.socketID).emit('gameAccepted', roomCounter)
        roomsControl[roomCounter] = 1
        roomCounter = (roomCounter + 1) % maxRooms

        let turn = Math.round(Math.random())
        if (turn == 0) {
            io.to(inviterUser.socketID).emit('yourTurn', 0)
            socket.emit('NotYourTurn')
        }
        else {
            socket.emit('yourTurn', 0)
            io.to(inviterUser.socketID).emit('NotYourTurn')
        }
    })

    socket.on('denyGame', (data) => {
        inviter = data
        invited = myusername
        let inviterUser = usersData.find((item) => item.username == inviter)
        io.to(inviterUser.socketID).emit('gameDenied')
    })

    socket.on('joinRoom', (room) => {
        socket.join(room)
        socket.to(room).emit('msg', `Jogador ${myusername} entrou na sala ${room}`);
    })

    socket.on('leaveRoom', (room, dcflag) => {
        socket.to(room).emit('msg', `Jogador ${myusername} saiu da sala ${room}`);
        socket.leave(room)
        if (dcflag) {
            games[room] = null
            roomsControl[room] = null
        }
    })

    socket.on('msg', (msg, room) => {
        io.to(room).emit(myusername + ' diz: ' + msg)
    })

    socket.on('played', (room, lastTurn, jogada) => {
        if (room == null) room = 0
        io.to(room).emit('playerPlayed', lastTurn, jogada)
        games[room][jogada] = (lastTurn ? 'o' : 'x')
        if (verificarFimDeJogo(room)) {
            io.to(room).emit('gameOver', `${myusername} VENCEU O JOGO!`, room)
            games[room] = null
            roomsControl[room] = null
        }
        // else if(lastTurn == 9){

        // }
        else socket.to(room).emit('yourTurn', !lastTurn)
    })

    socket.on('giveup', (room) => {
        if (room == null) room = 0
        socket.to(room).emit('msg', `${myusername} saiu da sala ${room}`)
        socket.to(room).emit('gameOver', `${myusername} desistiu, VOCÊ VENCEU!`, room)
        socket.leave(room)
        games[room] = null
        roomsControl[room] = null
    })
})

// funcao de autenticacao
function authenticate(data, callback) {
    console.log('verificando se cliente pode connectar')
    let name = data.username;

    if (usersData.find(element => element.username == name)) {
        return callback('error', { message: 'Nome de usuário já existe' });
    }
    else {
        return callback(null, true);
    }
}

// funcao que verifica fim de jogo
function verificarFimDeJogo(g) {
    g = games[g]
    if (casasIguais(g.casa1, g.casa2, g.casa3) || casasIguais(g.casa4, g.casa5, g.casa6) || casasIguais(g.casa7, g.casa8, g.casa9) ||
        casasIguais(g.casa1, g.casa4, g.casa7) || casasIguais(g.casa2, g.casa5, g.casa8) || casasIguais(g.casa3, g.casa6, g.casa9) ||
        casasIguais(g.casa1, g.casa5, g.casa9) || casasIguais(g.casa3, g.casa5, g.casa7)
    ) return true;
    return false
}

// funcao que verifica igualdade entre 3 elementos e se eles nao sao -1
function casasIguais(a, b, c) {
    if (a != -1 && a == b && b == c) return true
    return false
}

io.listen(5000)
console.log('escutando sockets na porta 5000')
