(function(e){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=e()}else if(typeof define==="function"&&define.amd){define([],e)}else{var n;if(typeof window!=="undefined"){n=window}else if(typeof global!=="undefined"){n=global}else if(typeof self!=="undefined"){n=self}else{n=this}n.TinyEmitter=e()}})(function(){var e,n,t;return function r(e,n,t){function i(o,u){if(!n[o]){if(!e[o]){var s=typeof require=="function"&&require;if(!u&&s)return s(o,!0);if(f)return f(o,!0);var a=new Error("Cannot find module '"+o+"'");throw a.code="MODULE_NOT_FOUND",a}var l=n[o]={exports:{}};e[o][0].call(l.exports,function(n){var t=e[o][1][n];return i(t?t:n)},l,l.exports,r,e,n,t)}return n[o].exports}var f=typeof require=="function"&&require;for(var o=0;o<t.length;o++)i(t[o]);return i}({1:[function(e,n,t){function r(){}r.prototype={on:function(e,n,t){var r=this.e||(this.e={});(r[e]||(r[e]=[])).push({fn:n,ctx:t});return this},once:function(e,n,t){var r=this;function i(){r.off(e,i);n.apply(t,arguments)}i._=n;return this.on(e,i,t)},emit:function(e){var n=[].slice.call(arguments,1);var t=((this.e||(this.e={}))[e]||[]).slice();var r=0;var i=t.length;for(r;r<i;r++){t[r].fn.apply(t[r].ctx,n)}return this},off:function(e,n){var t=this.e||(this.e={});var r=t[e];var i=[];if(r&&n){for(var f=0,o=r.length;f<o;f++){if(r[f].fn!==n&&r[f].fn._!==n)i.push(r[f])}}i.length?t[e]=i:delete t[e];return this}};n.exports=r;n.exports.TinyEmitter=r},{}]},{},[1])(1)});

// class Entity {
//     constructor(type, subtype) {
//         this.type = type;
//         this.subtype = subtype;
//         this.id = null;
//         this.nick = "";
//         this.x = 0;
//         this.y = 0;
//         this.angle = 0;
//     }
// }
// class Collider extends Entity {
//     constructor(subtype) {
//         super(1, subtype);
//         this.shapeIndex = null;
//     }
//     updateNetwork(view, offset, isFull) {
//         this.x = view.getFloat32(offset, true);
// 		offset += 4;
// 		this.y = -view.getFloat32(offset, true);
// 		offset += 4;
// 		this.angle = view.getFloat32(offset, true);
// 		offset += 4;
// 		this.shapeIndex = view.getUint8(offset, true);
// 		offset += 1;
// 		return offset;
//     }
// }

/*
    Options

    party - invite
    nick - nickname
    autoplay - autoreconnect on death
    country - your country code
    address - server address

    Events

    server - found server link
    close - disconnected from server
    open - connected to server
    hello - sent hello
    ping - sent ping
    id - got id
    king - update king info
    kill - killed someone
    died - died
    leaderboard - updated leaderboard
    rank - updated rank
    map - updated map
*/

class Brutal extends TinyEmitter {
    constructor(options = {}) {
        super();
        this.party = options.party;
        this.nick = options.nick;
        this.address = options.address;
        this.ws = null;
        this.room = null;
        this.ready = false;
        this.id = 0;
        this.playing = false;
        this.rank = 0;
        this.score = 0;
        this.autoplay = options.autoplay;
        this.leaderboard = [];
        this.map = [];
        this.country = options.country || "UA";

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

        this.net = {
            findServer(party) {
                return new Promise((resolve, reject) => {
                    fetch("http://master.brutal.io", {
                        method: "put",
                        body: this.country + (party ? `;` + party : "")
                    }).then(i => i.text()).then(res => {
                        if(res == "0") return reject("Link expired!");
                        if(res == "1") return reject("Server is full.");

                        let room = +res.split("/")[1].split("!")[0];
                        let address = res.split("/")[0].split(":")[0];
                        let port = 8080 + room;

                        return resolve({
                            address: `${address}:${port}`,
                            room,
                            party: res.split("/")[1].split("!")[1]
                        })
                    })
                });
            },
            onClose: () => {
                this.emit("close");
                this.ready = false;
                this.playing = false;
                this.world.connect();
            },
            onOpen: () => {
                this.emit("open");

                this.net.sendHello();
                this.net.ping();
                this.ready = true;
                this.net.sendNick(this.nick || "dimden's bot");
            },
            onMessage: msg => {
                let view = new DataView(msg.data);
                let op = view.getUint8(0);

                switch(op) {
                    case this.opcodes.server.OPCODE_ENTERED_GAME: {
                        let offset = 1;
                        this.id = view.getUint32(offset, true); // This is my ID

                        this.playing = true;

                        this.emit("id", this.id);
                        console.log(this.id);
                    }
                    case this.opcodes.server.OPCODE_ENTITY_INFO_V1:
                    case this.opcodes.server.OPCODE_ENTITY_INFO_V2: {
                        this.world.updateEntities(view, op);
                        break;
                    }
                    case this.opcodes.server.OPCODE_EVENTS: {
                        this.world.processEvents(view);
                        break;
                    }
                    case this.opcodes.server.OPCODE_LEADERBOARD_V1:
                    case this.opcodes.server.OPCODE_LEADERBOARD_V2: {
                        let offset = this.world.processLeaderboard(view, op);
                        this.emit("leaderboard", this.leaderboard);
                        let id = view.getUint16(offset, true);
                        offset += 2;

                        if(id > 0) {
                            let score;
                            if(op === this.opcodes.server.OPCODE_LEADERBOARD_V1){
                                score = view.getUint16(offset, true);
                                offset += 2;
                            } else {
                                score = view.getUint32(offset, true);
                                offset += 4;
                            }

                            let rank = view.getUint16(offset, true);
                            offset += 2;

                            this.rank = rank;
                            this.score = score;

                            this.emit("rank", {rank, score});

                        } else {
                            this.rank = 0;
                            this.score = 0;

                            this.emit("rank", {rank: 0, score: 0});
                        }
                    }
                    case this.opcodes.server.OPCODE_MINIMAP: {
                        this.world.updateMapInfo(view);
                    }
                }
            },
            sendHello: () => {
                if(!this.ws || this.ws.readyState !== 1) return;
                let arr = new ArrayBuffer(5);
                let dv = new DataView(arr);

                dv.setUint8(0, 1);
                dv.setUint16(1, 1680 / 10 * 1, 1);
                dv.setUint16(3, 1050 / 10 * 1, 1);

                this.emit("hello");
                this.ws.send(arr);
            },
            ping: () => {
                if(!this.ws || this.ws.readyState !== 1) return;
                let arr = new ArrayBuffer(1);
                (new DataView(arr)).setUint8(0, 0);

                this.emit("ping");
                this.ws.send(arr);
            },
            sendNick: (nick = this.nick) => {
                if(!this.ws || this.ws.readyState !== 1) return;
                let arr = new ArrayBuffer(3 + 2 * nick.length),
                    dv  = new DataView(arr);
                dv.setUint8(0, 3);
                for (let e = 0; e < nick.length; ++e) {
                    dv.setUint16(1 + 2 * e, nick.charCodeAt(e), 1);
                }
                this.ws.send(arr);
            },
            sendInput: (angle, throttle) => {
                if(!this.ws || this.ws.readyState !== 1) return;
                let arr = new ArrayBuffer(10),
                    dv = new DataView(arr);
                dv.setUint8(0, 5);
                dv.setFloat64(1, angle, 1);
                dv.setUint8(9, throttle, 1);
                this.ws.send(arr);
            },
            sendClick: hold => {
                if(!this.ws || this.ws.readyState !== 1) return;
                let arr = new ArrayBuffer(2),
                    dv  = new DataView(arr);
                dv.setUint8(0, 8);
                hold ? dv.setUint8(1, 1) : dv.setUint8(1, 0);
                this.ws.send(arr)
            }
        };
        this.world = {
            king: {
                id: null,
                x: 0,
                y: 0
            },
            connect: () => {
                if(!this.address) return;
                this.ws = new WebSocket("ws://" + this.address);
                this.ws.binaryType = "arraybuffer";

                this.ws.onclose = this.net.onClose;
                this.ws.onopen = this.net.onOpen;
                this.ws.onmessage = this.net.onMessage;
            },
            entities: {},
            updateMapInfo: view => {
                let offset = 1;
                let count = view.getUint16(offset, true);
                offset += 2;
                let mapInfo = [];
                try {
                    for(let i = 0; i < count; i++) {
                        let x = view.getUint8(offset++, true);
                        let y = view.getUint8(offset++, true);
                        let r = view.getUint8(offset++, true);
                        let playerInfo = {x: x, y: 256-y, r: r};
                        mapInfo.push(playerInfo);
                    }
                    this.map = mapInfo;
                    this.emit("map", this.map);
                } catch(e) {}
            },
            processLeaderboard: (view, op) => {
                let offset = 1; // Skip opcode

                let leaderboardInfo = [];
                let containsData = false;
                while(true) {
                    let id = view.getUint16(offset, true);
                    offset += 2;
                    if(id === 0) break;

                    containsData = true;

                    let score;
                    if(op === this.opcodes.server.OPCODE_LEADERBOARD_V1) {
                        score = view.getUint16(offset, true);
                        offset += 2;
                    } else {
                        score = view.getUint32(offset, true);
                        offset += 4;
                    }

                    let res = this.utils.getString(view, offset);
                    let nick = res.nick;
                    offset = res.offset;

                    let leaderboardItemInfo = {};
                    leaderboardItemInfo.nick = this.utils.getPlayerName(nick);
                    leaderboardItemInfo.score = score;
                    leaderboardItemInfo.id = id;
                    leaderboardInfo.push(leaderboardItemInfo);
                }

                if(containsData) {
                    this.leaderboard = leaderboardInfo;
                }

                return offset;
            },
            processEvents: view => {
                let offset = 1;

                while(true) {
                    let byte_ = view.getUint8(offset++, true);

                    if(byte_ === 0) break;

                    switch(byte_) {
                        case this.opcodes.event.EVENT_DID_KILL: {
                            let id = view.getUint16(offset, true);
                            offset += 2;

                            let res = this.utils.getString(view, offset);
                            let nick = res.nick;
                            offset = res.offset;

                            this.emit("kill", {id, nick});
                            break;
                        }
                        case this.opcodes.event.EVENT_WAS_KILLED: {
                            let id = view.getUint16(offset, true);
                            offset += 2;

                            let res = this.utils.getString(view, offset);
                            let nick = res.nick;
                            offset = res.offset;

                            this.playing = false;
                            this.emit("died", {id, nick});

                            if(this.autoplay) setTimeout(this.net.sendNick);
                            break;
                        }
                    }
                }
            },
            updateEntities: (view, op) => {
                let offset = 1;

//                 while(true) {
//                     let id = view.getUint16(offset, true);
//                     offset += 2;

//                     if(id === 0) {
//                         if(offset !== view.byteLength) {
//                             this.world.king.id = view.getUint16(offset, true);
//                             offset += 2;
//                             if(kingID > 0) {
//                                 this.world.king.x  = view.getFloat32(offset, true);
//                                 offset += 4;
//                                 this.world.king.y = -view.getFloat32(offset, true);
//                                 offset += 4;
//                             }
//                             this.emit("king", this.world.king);
//                         }
//                         break;
//                     }

//                     let flags = view.getUint8(offset, true);
//                     offset += 1;

//                     let entity;
//                     switch(flags) {
//                         case 0: // Update
//                             entity = this.world.entities[id];
//                             if(entity) offset = entity.updateNetwork(view, offset, false, op);
//                             break;
//                         case 1: // Create
//                             let entityType = view.getUint8(offset++, true);
//                             let entitySubType = view.getUint8(offset++, true);

//                             let res = this.utils.getString(view, offset);
//                             let nick = res.nick;
//                             offset = res.offset;

//                             entity = new Entity(entityType, entitySubType);
//                             entity.nick = nick;
//                             entity.id = id;
//                             this.world.entities[id] = entity;
//                             offset = entity.updateNetwork(view, offset, true, op);
//                             break;
//                         case 0x2: // Delete
//                             delete this.world.entities[id];
//                             break;
//                     }
//                 }
            }
        }
        this.utils = {
            getString(view, offset) {
                let nick = "";
                for(;;) {
                    let v = view.getUint16(offset, true);
                    offset += 2;
                    if(v === 0) break;
                    nick += String.fromCharCode(v);
                }
                return {
                    nick: nick,
                    offset: offset
                };
            },
            getPlayerName(name) {
                let playerName = name;
                if(playerName == '') playerName = '<Unnamed>';
                return playerName;
            }
        }

        this.init();
    }
    async init() {
        if(!this.address) {
            let server = await this.net.findServer(this.party);

            this.room = server.room;
            this.party = server.party;
            this.address = server.address;

            this.emit("server", server);

            this.world.connect();
        } else this.world.connect();

        setInterval(this.net.ping, 150);
    }
}