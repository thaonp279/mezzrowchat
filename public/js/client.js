
class Chat extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      input: ''
    }

    this.handleChange = this.handleChange.bind(this);
    this.sendMessage = this.sendMessage.bind(this);
  }

  sendMessage(e) {
    e.preventDefault();
    if (this.state.input) {
      this.props.sendMessage(this.state.input);
      this.setState({input: ''});
    }
    this.props.signalTyping(0);
  }
  
  handleChange(e) {
    this.setState(state => ({input: e.target.value}));
    this.props.signalTyping(e.target.value.length);
  }
  
  render() {
    let messages = this.props.archive.map(message => {
      let alias, avatar, className;
      if (message.from==='myself') {
        alias = this.props.user.alias;
        className = 'mine';
        avatar = 'public/img/'+this.props.user.hero+'.jpg';
      } else {
        alias = this.props.members.filter(member => member.username === message.from)[0].alias;
        className = 'theirs';
        avatar = 'public/img/'+this.props.members.filter(member => member.username === message.from)[0].hero+'.jpg';
      }

      return (
        <li className={className}>
          <div className='avatar'>
            <img src={avatar}/>
          </div>
          <div className='text'>
            <h5>{alias}</h5>
            <p>{message.content}</p>
          </div>
        </li>
      )
    })

    let typing = this.props.typing.map(typer => {
      let alias = this.props.members.filter(member => member.username === typer)[0].alias;
      
      return (
        <li className='typing'>
          <p>{alias} is typing...</p>
        </li>
      )
    })

    return (
      <div className='content'>
        <ul id='messages'>
          {messages}
          {typing}
          <li ref={this.props.lastMessage}/>
        </ul>
        <form onSubmit={this.sendMessage}>
          <input onChange={this.handleChange} type='text' name='message' placeholder="C'mon chit chat something" socketId='public' autocomplete="off" value={this.state.input}/>
          <button>
            <i className="fas fa-paper-plane fa-lg"/>
          </button>
        </form>
      </div>
    )
  }
}



class Rooms extends React.Component {
  constructor(props) {
    super(props);
    this.selectRoom = this.selectRoom.bind(this);
  };
  
  selectRoom(e) {
    this.props.selectRoom(e.currentTarget.id);
  }
  render(){
    let newMessage = <i className='fas fa-exclamation' />;
    let rooms = this.props.roomData.map(room => {
      return (
        <div id={room.roomId} className={room.roomId === this.props.activeRoom? 'active room': 'room'} onClick={this.selectRoom}>
          <h5>{room.roomName}</h5>
          {room.newMessage? newMessage: null}
        </div>
      )
    });
    
    return (
      <div id='room-list' className='content'>
        {rooms}
      </div>
    )
  }
}




class App extends React.Component{
  constructor(props) {
    super(props);
    this.state = {
      activeRoom: 'public',
      rooms: [{
        roomId: 'public',
        roomName: 'public chat room',
        newMessage: false,
        members: [],
        archive: [],
        typing: []
      }]
    };
    this.socket;
    this.user;
    this.lastMessage = React.createRef();

    this.selectRoom = this.selectRoom.bind(this);
    this.sendMessage = this.sendMessage.bind(this);
    this.addMessage = this.addMessage.bind(this);
    this.signalTyping = this.signalTyping.bind(this);
  };
  
  componentDidMount(){
    this.configureSocket();
  }

  componentDidUpdate(){
    this.lastMessage.current.scrollIntoView();
    console.log('new state: ', this.state);
  }
  configureSocket(){
    var socket = io();
    this.socket = socket;
    console.log(this.socket);

    socket.on('welcome', data => {
      console.log('my id:', data);
      this.user = data.myData;
      this.setState(state => {
        let rooms = state.rooms.map(room => {
          return room.roomId === 'public'
            ? {...room, members: data.currentUsers}
            : room
        });

        return {rooms}
      });
      
      data.currentUsers.forEach(user => {
        if (user.username!== this.user.username) {
          this.createRoom(user.username, user.alias, [user]);
        }
      })
    })

    socket.on('user joined', user => {
      let roomExisted = this.state.rooms.filter(room => room.roomId === user.username)[0];
      if (!roomExisted){
        this.createRoom(user.username, user.alias, [user]);
        this.setState(state => {
          let rooms = state.rooms.map(room => {
            return room.roomId === 'public'
              ? {...room, members: [...room.members, user]}
              : room
          });

          return {rooms}
        })
      }
    })

    socket.on('chat message', data => {
      if (data.from !== this.user.username){
        //if user send private message then post to their room, else post to group room
        let room = data.to === this.user.username? data.from: data.to;
        this.addMessage(data.content, room, data.from)
      }
    })

    socket.on('typing', data => {
      let room = data.to === this.user.username? data.from: data.to;
      this.addTyper(data.from, room);
    })

    socket.on('stop typing', data => {
      let room = data.to === this.user.username? data.from: data.to;
      this.removeTyper(data.from, room);
    })

  }

  selectRoom(roomId) {
    this.setState(state => {
      let resetNewMessage = state.rooms.map(room => {
        return room.roomId === roomId
          ? {...room, newMessage: false}
          : room
      });
      return {activeRoom: roomId, rooms: resetNewMessage}
      
    })
  }
  
  addMessage(message, roomId, username){

    this.setState(state => {
      let rooms = state.rooms.map(room => {
        return room.roomId === roomId && room.roomId === this.state.activeRoom
          ? {...room, archive: [...room.archive, {
            content: message,
            'from': username
            }]}
          : room.roomId === roomId && room.roomId !== this.state.activeRoom
          ? {...room, newMessage: true, archive: [...room.archive, {
            content: message,
            'from': username
            }]}
          : room
      });
      return {rooms: rooms}
    });
  }
  
  sendMessage(message) {
    this.addMessage(message, this.state.activeRoom, 'myself');
    this.socket.emit('chat message', {
      to: this.state.activeRoom,
      content: message
    })
  }
  
  //members format [{username, alias, hero}]
  createRoom(roomId, roomName, members) {
    this.setState(state => ({
      rooms: [...state.rooms, {
        roomId,
        roomName,
        newMessage: false,
        members,
        archive: [],
        typing: []
      }]
    }))
  }

  addTyper(username, roomId) {
    this.setState(state => {
      let updateTyping = state.rooms.map(room => {
        let isAlreadyTyping = room.typing.filter(typer => typer===username)[0];
        return room.roomId === roomId && isAlreadyTyping=== undefined
          ? {...room, typing: [...room.typing, username]}
          : room
      });

      return {rooms: updateTyping}
    });
  }

  removeTyper(username, roomId) {
    this.setState(state => {
      let updateTyping = state.rooms.map(room => {
        if (room.roomId === roomId) {
          room.typing = room.typing.filter(typer => typer!== username);
        }
        return room
      })

      return {rooms: updateTyping}

    })
  }

  signalTyping(messageSize){
    if (messageSize===1) {
      this.socket.emit('typing', {
        to: this.state.activeRoom
      })

    } else if (messageSize===0) {
      this.socket.emit('stop typing', {
        to: this.state.activeRoom
      })

    }

  }


  render() {
    
    var roomData = this.state.rooms.map(room => {
    return {roomId: room.roomId, roomName: room.roomName, newMessage: room.newMessage}
  });
    var chatData = this.state.rooms.filter(room => room.roomId === this.state.activeRoom)[0];
    return (
      <div id='container'>
        <div id='chat-nav'>
          <div className='nav-bar'>Chat</div>
          <Rooms
            activeRoom={this.state.activeRoom}
            roomData={roomData}
            selectRoom={this.selectRoom}
          />
        </div>

        <div id='chat-preview'>
          <div className='nav-bar' id='chat-heading'>{chatData.roomName}</div>
          <Chat
            user={this.user}
            roomId={chatData.roomId}
            roomName={chatData.roomName}
            archive={chatData.archive}
            members={chatData.members}
            typing={chatData.typing}
            sendMessage={this.sendMessage}
            signalTyping={this.signalTyping}
            lastMessage={this.lastMessage}
          />
        </div>
      </div>
    
    )
  }
}

ReactDOM.render(<App />, document.getElementById('root'))