# Brutal.js
[Brutal.io](http://brutal.io/) client created by [dimden](https://dimden.dev/).

Currently only browser is supported (you can't run it in Node.js), feel free to contribute!  
Support Discord Server: [https://discord.gg/k4u7ddk](https://discord.gg/k4u7ddk).

#### Features
* Entire Client -> Server protocol (movement, clicks, nick, ....)
* Party support
* Leaderboard support
* Minimap support
* Getting player id
* Support of deaths and kills
#### TODO
* Implement Node.js support
* Implement entities support
* Fix bug with king

## Example
```js
// Using party (has player limit)
let bot = new Brutal({
    party: "1wlc",
    nick: `dimden's bot`,
    autoplay: true
});
// Using raw server address
let bot = new Brutal({
    address: "164.132.205.24:8080",
    nick: `dimden's bot`,
    autoplay: true
});
```

## Options
* `party` - invite to the server (Note: this has ~70 user limit)
* `nick` - nick of the bot
* `autoplay` - play again on death
* `country` - your country code (default `UA`)
* `address` - raw address of server, no need for `party` option

## Events
* `server` - found server address using party invite. `{room, party, address}`
* `close` - disconnected from server (will automatically reconnect).
* `open` - connected to server (__it doesn't mean you're in game yet, use `this.playing`__)
* `hello` - sent "hello" message by protocol
* `ping` - pinged server
* `id` - got your id in game
* `king` - updated king info (doesn't work yet)
* `kill` - killed someone `{id, nick}`
* `died` - died `{id, nick}`
* `leaderboard` - updated leaderboard
* `rank` - updated your rank on leaderboard `{rank, score}`
* `map` - got/updated map

## API
`this.party` - your party invite if you have one  
`this.nick` - your nick  
`this.address` - address of server bot connected to  
`this.ws` - WebSocket  
`this.room` - your room id (only if you gave `party` link)  
`this.ready` - ready to join game (bool)  
`this.id` - your id in game  
`this.playing` - is in game (bool)  
`this.rank` - your rank in leaderboard  
`this.score` - your score  
`this.autoplay` - autoplay on death  
`this.leaderboard` - leaderboard data, 10 length array, each player has `id`, `score` and `nick`.  
`this.map` - map data  
`this.country` - `options.country` (default `UA`)  
`this.init()` - init everything  

### Opcodes
```js
this.opcodes = {
    client: {
        OPCODE_PING: 0x00,
        OPCODE_HELLO: 0x01,
        OPCODE_HELLO_BOT: 0x02,
        OPCODE_ENTER_GAME: 0x03,
        OPCODE_LEAVE_GAME: 0x04,
        OPCODE_INPUT: 0x05,
        OPCODE_INPUT_BRAKE: 0x06,
        OPCODE_AREA_UPDATE: 0x07,
        OPCODE_CLICK: 0x08
    },
    server: {
        OPCODE_PONG: 0x00,
        OPCODE_MAP_CONFIG: 0xA0,
        OPCODE_ENTERED_GAME: 0xA1,
        OPCODE_ENTITY_INFO_V1: 0xB4,
        OPCODE_ENTITY_INFO_V2: 0xB3,
        OPCODE_EVENTS: 0xA4,
        OPCODE_LEADERBOARD_V1: 0xA5,
        OPCODE_LEADERBOARD_V2: 0xB5,
        OPCODE_MINIMAP: 0xA6
    },
    event: {
        EVENT_DID_KILL: 0x01,
        EVENT_WAS_KILLED: 0x02
    },
    entity: {
        ENTITY_ITEM: 4,
        ENTITY_PLAYER: 5,
        ENTITY_COLLIDER: 1
    },
    sub_entity: {
        SUB_ENTITY_ITEM_ATOM: 0,
        SUB_ENTITY_ITEM_ENERGY: 1,
        SUB_ENTITY_ITEM_TRI_PLUS: 2,
        SUB_ENTITY_ITEM_TRI_MINUS: 3,
        SUB_ENTITY_ITEM_REDFLAIL: 4
    }
}
```
### Net
- `this.net.findServer(party)` - get server address by party link (party link is optional if you just want to find random server), returns `{address, room, party}`
- `this.net.onClose()` - on websocket close
- `this.net.onOpen()` - on websocket open
- `this.net.onMessage(msg)` - on websocket message
- `this.net.sendHello(width, height)` - send hello message (width and height are optional)
- `this.net.ping()` - ping server
- `this.net.sendNick(nick)` - `nick` is optinal; **in brutal.io this method starts the game, beware**
- `this.net.sendInput(angle, throttle)` - send movement
- `this.net.sendClick(hold)` - send click

### World
- `this.world.king` - `{id, x, y}` (doesn't work yet)
- `this.world.connect()` - connect to server
- `this.world.entities` - object with entities (doesn't work yet)
- `this.world.updateMapInfo(view)` - update map
- `this.world.processLeaderboard(view, op)` - process leaderboard data
- `this.world.processEvents(view)` - process event data
- `this.world.updateEntities(view, op)` - process entity data (doesn't work yet)

### Utils
- `this.utils.getString(view, offset)` - get string from dataview
- `this.utils.getPlayerName(playername)` - get proper nick

# Warning
**There's a lot of stuff, but you actually don't need anything from `this.world`, `this.utils`, you only need movement and click methods,
leaderboard, id, rank, minimap, death & kills. Client connects to server and joins the server automatically, and if there's `autoplay` option, it'll play again on death!**

# Other
Contributions are very appreciated!  
Created by dimden. [Discord](https://discord.gg/k4u7ddk).