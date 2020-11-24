document.getElementById('entrar').addEventListener('click', () => {
    let socket = io('localhost:5000');
    // VARIAVEIS "GLOBAIS"
    let inviter, invited, myusername, gameRoom, timeout, timeout2, timeout3
    let arraydeUsuarios = []

    // GUARDANDO REFERENCIA DE ALGUNS ELEMENTOS DE USO RECORRENTE
    const containerUsers = document.getElementById('userContainer')
    const vez = document.getElementById('vez')
    const entrar = document.getElementById('entrar')
    const invitCont = document.getElementById('invite-container')
    const invitedBox = document.getElementById('invited-box')
    const inviterWaitBox = document.getElementById('inviter-waitBox')
    const blockGame = document.getElementById('blockGame')
    const accpet = document.getElementById('aceitar')
    const deny = document.getElementById('negar')
    const jogo = document.getElementById('jogo')
    const usernameBox = document.getElementById('username')
    const voce = document.getElementById('voce')
    
    const loginContaier = document.getElementById('login-container');
    loginContaier.classList.add('display-hidden')

    const inicioContainer = document.getElementById('aguardando-inicio');

    const userSideContainer = document.getElementById('users-side');
    userSideContainer.classList.remove('display-hidden')

    // ADICIONANDO ALGUNS EVENTOS DE CLICK
    accpet.addEventListener('click', () => {
        clearTimeout(timeout)
        clearTimeout(timeout2)
        inicioContainer.classList.add('display-hidden');
        socket.emit('acceptGame', inviter)
        invitCont.classList.add('display-hidden')
        jogo.classList.remove('display-hidden')
        vez.classList.remove('display-hidden')
        let casas = document.getElementsByClassName('casa')
        Array.prototype.forEach.call(casas, (casa) => {
            casa.style.backgroundImage = 'none';
        });
    })
    deny.addEventListener('click', () => {
        clearTimeout(timeout)
        clearTimeout(timeout2)
        socket.emit('denyGame', inviter)
        invitCont.classList.add('display-hidden')
    })

    document.getElementById('desistir').addEventListener('click', () => {
        clearTimeout(timeout3)
        socket.emit('giveup', gameRoom)
        vez.textContent = 'VOCÊ DESISTIU'
        console.log('Você desistiu')
        console.log(`Você saiu da sala ${gameRoom}`)
        vez.style.backgroundColor = '#2d8ac9'
        jogo.classList.add('display-hidden')
    })


    // ADICIONANDO EVENTOS NOS SOCKETS
    socket.on('connect', function () {
        socket.emit('authentication', { username: usernameBox.value });
    });

    socket.on('loaddata', function (data) {
        data.forEach((coord) => {
            let marcador = L.marker([coord.lat, coord.long]);
            marcador.bindTooltip(coord.nome, { permanent: true }).openTooltip();
            marcador.addTo(mymap)
        })
    });

    socket.on('authenticated', function (usernamesList) {
        voce.classList.remove('display-hidden')
        vez.classList.add('display-hidden')
        renderUsers(usernamesList)
        entrar.classList.add('display-hidden')
        myusername = usernameBox.value
        console.log('Você entrou')
    });

    socket.on('unauthorized', function (err) {
        console.log('Erro na autenticacao:', err.message);
    });

    socket.on('reconnecting', function (err) {
        console.log('reconectando...');
    });

    socket.on('msg', function (message, room) {
        if (room != undefined) {
            if (room == null)
                room = 0
            gameRoom = room
        }
        console.log(message);
    });

    socket.on('newUser', (usr) => {
        addUser(usr)
    });

    socket.on('disconnect', function () {
        console.log('desconectou do servidor');
    });

    socket.on('gameInvite', function (theInviter) {
        inviter = theInviter
        invited = myusername
        document.getElementById('inviter').textContent = inviter;
        document.getElementById('invitemsg').textContent = 'desafiou você para um jogo';
        invitedBox.classList.remove('display-hidden')
        invitCont.classList.remove('display-hidden')
        inviterWaitBox.classList.add('display-hidden')        

        clearTimeout(timeout)
        clearTimeout(timeout2)
        timeout = setTimeout(() => {
            invitCont.classList.add('display-hidden')
            alert(`Tempo esgotado - você não respondeu o convite de ${inviter} a tempo`)
        }, 15000)

    });

    socket.on('userLeaved', (usr) => {
        rmUser(usr)
        if (usr == invited || usr == inviter) {
            vez.style.backgroundColor = '#eeec8e'
            vez.textContent = 'Oponente desconectou. Convide alguém para jogar!'
            jogo.classList.remove('display-hidden')
            socket.emit('leaveRoom', gameRoom, 1)
        }
    })

    socket.on('gameAccepted', (room) => {
        clearTimeout(timeout)
        clearTimeout(timeout2)
        let casas = document.getElementsByClassName('casa')
        Array.prototype.forEach.call(casas, (casa) => {
            casa.style.backgroundImage = 'none';
            casa.classList.add('cursor-pointer');
        });
        gameRoom = room
        inicioContainer.classList.add('display-hidden');
        invitCont.classList.add('display-hidden')
        socket.emit('joinRoom', room)
        console.log('Você entrou na sala ' + room)
        console.log(`Jogador ${invited} entrou na sala ${room}`)
        jogo.classList.remove('display-hidden')
        vez.classList.remove('display-hidden')
    })

    socket.on('gameDenied', () => {
        clearTimeout(timeout)
        clearTimeout(timeout2)
        invitCont.classList.add('display-hidden')
        alert(invited + ' negou o seu convite')
    })

    socket.on('playerPlayed', (lastTurn, casaJogada) => {
        let fig = (lastTurn ? 'url(1.svg)' : 'url(0.svg)')
        const casa = document.getElementById(casaJogada)
        casa.style.backgroundImage = fig
        casa.classList.add('cursor-pointer');
    })

    socket.on('yourTurn', (turn) => {
        blockGame.classList.add('display-hidden')
        vez.textContent = 'SUA VEZ'
        vez.style.backgroundColor = '#008000'
        playTurn(turn)
    })

    socket.on('NotYourTurn', () => {
        blockGame.classList.remove('display-hidden')
        vez.style.backgroundColor = '#ff0000'
        vez.textContent = 'VEZ DO OPONENTE'
    });

    socket.on('gameOver', (message, room) => {
        socket.emit('leaveRoom', room)
        console.log(message)
        console.log(`Você saiu da sala ${room}`)
        vez.textContent = message
        vez.style.backgroundColor = '#2d8ac9'
    })

    // FUNCAO PARA ADICIONAR LISTA DE USUARIOS
    renderUsers = function (users) {
        users.forEach(usr => {
            addUser(usr.username)
        })
    }

    // FUNCAO PARA ADICIONAR UM USUARIO
    addUser = function (usr) {
        arraydeUsuarios.push(usr)
        const userDiv = document.createElement('DIV')
        userDiv.classList.add('user-class')
        userDiv.id = usr
        userDiv.innerHTML = usr
        containerUsers.appendChild(userDiv)
        console.log(`Usuário ${usr} entrou`)
        userDiv.addEventListener('click', () => {
            socket.emit('gameInvite', { inviter: myusername, invited: usr })
            invited = usr
            inviter = myusername
            inviterWaitBox.classList.remove('display-hidden')
            document.getElementById('wait-msg').textContent = 'Aguardando resposta do jogador:'

            document.getElementById('waitedPlayer').textContent = usr

            invitedBox.classList.add('display-hidden')

            invitCont.classList.remove('display-hidden')

            clearTimeout(timeout)
            clearTimeout(timeout2)
            timeout2 = setTimeout(() => {
                invitCont.classList.add('display-hidden')
                alert(`Tempo esgotado - ${invited} não respondeu a tempo`)
            }, 15000)

        })
    }

    // FUNCAO PARA REMOVER USUARIO DA LISTA
    rmUser = function (usr) {
        const index = arraydeUsuarios.indexOf(usr)
        if (index > -1) {
            arraydeUsuarios.splice(index, 1)
            var item = document.getElementById(usr);
            item.parentNode.removeChild(item)
            console.log(`Usuário ${usr} saiu`)
        }
    }

    // FUNCAO PARA REALIZAR JOGADA
    playTurn = function (turn) {
        timeout3 = setTimeout(() => {
            socket.close()
            loginContaier.classList.remove('display-hidden')
            entrar.classList.remove('display-hidden')
            jogo.classList.add('display-hidden')
            vez.textContent = 'Entre novamente'
            vez.style.backgroundColor = '#eeec8e'
            voce.classList.add('display-hidden')
            removeAllChildNodes(containerUsers);
            alert('Você foi desconectado por inatividade')
        }, 30000)

        let casas = document.getElementsByClassName('casa')
        Array.prototype.forEach.call(casas, (casa) => {
            casa.onclick = () => {
                casa.onclick = null
                if (casa.style.backgroundImage != 'none') return
                clearTimeout(timeout3)
                socket.emit('played', gameRoom, turn, casa.id)
                vez.style.backgroundColor = '#ff0000'
                vez.textContent = 'VEZ DO OPONENTE'
                blockGame.classList.remove('display-hidden')
            }
        });
    }

    function removeAllChildNodes(parent) {
        while (parent.firstChild) {
            parent.removeChild(parent.firstChild);
        }
    }
})
