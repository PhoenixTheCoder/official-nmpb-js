const Client = require('./Client');
const fs = require('fs');
let $ = require('jquery');
window.$ = $;

document.getElementById('connect').onclick = start;
document.getElementById('disconnect').onclick = disconnect;
const client = new Client(wss)

var wss = null;
var botName = "";
var clientsName = "NMPB (Socket)";

var clients = [];
var turns = false;
const users = [];
let currentUser = undefined;
var solo = false;
var echo = false;
let lol = 0;
var octaveAmount = 0;
var octaveEnabled = false;
var origTemp = [];
var origTemp1 = false;
var echoAmount = 0;
var echoDelay = 0;

let chat_buffer = [];
let chatSeconds = 6.3;
let chatAmount = 4;
let chatRevertTime = 0;
setInterval(() => {
    let msg = chat_buffer[chat_buffer.length - 1];
    if (msg && chatAmount > 0) {
        msg = chat_buffer.shift();
        client.sendArray([{ m: "a", message: msg }]);
        chatRevertTime = chatSeconds;
        chatAmount -= 1;
    }
}, 100);
setInterval(() => {
    if (chatAmount < 4)
        if (chatRevertTime > 0) chatRevertTime -= .1;
        else chatAmount = 4;
}, 100);
const resetChat = () => {
    chat_buffer = [];
};
const sendChat = msg => {
    msg.match(/.{0,509}/g).forEach(function(x, i) {
        if (x == "") return;
        if (i !== 0) x = "..." + x;
        if (chat_buffer.indexOf(x) < 0) chat_buffer.push(x);
    });
};

Array.prototype.random = function() {
    return this[(Math.random() * this.length) | 0];
};

function turns1() {
    Object.values(client.ppl).forEach(person => users.push(person));
    currentUser = users.random();
    if (currentUser._id == client.getOwnParticipant()._id) currentUser = users.random();
};

function turnEnabled() {
    lol = setTimeout(() => {
        turns1();
        sendChat(`${currentUser.name}, its your turn.`)
    }, 300000)
};

document.getElementById('midifile').onchange = function upload() {
    //document.getElementById('midifile').files;
    console.log(document.getElementById('midifile').files)
    fs.readFile(document.getElementById('midifile').files[0].path, (err, data) => {
        fs.writeFile('./midis/' + document.getElementById('midifile').files[0].name, data, () => {
            Player.loadFile(`./midis/${document.getElementById('midifile').files[0].name}`);
            Player.play();
        })
    });
}

function loadMidiFile(songName) {
    Player.stop();
    Player.loadFile(`./midis/${songName}`);
    Player.play();
}

window.onload = function loadMidis() {
    let midiFiles = fs.readdirSync('./midis/');

    midiFiles.map(midiFile => {
        $(`#MidiList`).append(`<option id="${midiFile}" value="${midiFile}">${midiFile}</option>`);
        document.getElementById(`${midiFile}`).addEventListener('dblclick', () => {
            loadMidiFile(document.getElementById(`${midiFile}`).value);
        })
    })
}
document.getElementById('isTurns').addEventListener('change', () => {
    if (document.getElementById('isTurns').checked) {
        turns = true;
        turns1();
        sendChat('Turns are enabled. It is [ ' + currentUser._id + ' ] / ' + currentUser.name + "'s turn. You have 5 minutes.");
    } else {
        clearInterval(lol);
        turns = false;
        sendChat('Turns are disabled.')
    }
})

function start() {
    console.log('hi')
        //const client = new Client("wss://foonix-socket1.glitch.me/");
    client.setChannel(document.getElementById('BotRoom').value);
    client.start();
}
client.on('hi', () => {
    client.setName(botName);
    console.log('Connected')
});

function disconnect() {
    client.stop();
}

client.on('participant added', p => {
    person = p._id;
})

client.on('participant removed', p => {
    if (turns == true) {
        if (p._id == currentUser._id) {
            turns1();
            client.say(`Since the last user left. It's ${currentUser.name}'s turn. You have 5 minutes.`);
            turnEnabled();
            return;
        }
    }
    person = "";
})

var keyNameMap = require('./key-map');
var MidiPlayer = require('midi-player-js');

var Player = new MidiPlayer.Player(function(event) {
    if (event.name == "Note off" || (event.name == "Note on" && event.velocity === 0)) {
        client.sendArray([{ m: "n", n: [{ n: keyNameMap[event.noteName], s: 1 }], t: Date.now() + 1000 }]);
        if (octaveEnabled) {
            for (let i = 1; i <= octaveAmount; i++) {
                client.sendArray([{ m: "n", n: [{ n: keyNameMap[Object.keys(keyNameMap)[Object.keys(keyNameMap).indexOf(event.noteName) + (i * 12)]], s: 1 }], t: Date.now() + 1000 }]);
            }
        }
    } else if (event.name == "Note on") {
        var volume = event.velocity / 127;
        client.sendArray([{ m: "n", n: [{ n: keyNameMap[event.noteName], v: volume }], t: Date.now() + 1000 }]);
        if (echo == true) {
            for (var j = 0; j < echoAmount; j++) {
                setTimeout(() => {
                    volume *= 0.5;
                    client.sendArray([{ m: "n", n: [{ n: keyNameMap[event.noteName], v: volume }], t: Date.now() + 1000 }]);
                }, echoDelay * (j + 30));
            }
        }
        if (octaveEnabled) {
            for (let i = 1; i <= octaveAmount; i++) {
                client.sendArray([{ m: "n", n: [{ n: keyNameMap[Object.keys(keyNameMap)[Object.keys(keyNameMap).indexOf(event.noteName) + (i * 12)]], v: volume }], t: Date.now() + 1000 }]);
            }
        }
    } else if (event.name == "Set Tempo") {
        Player.setTempo(event.data);
        if (origTemp1 == true) {
            origTemp = event.data;
            origTemp1 = false;
        }
    }
});

document.getElementById('roomVisible').addEventListener('change', () => {
    if (document.getElementById('roomVisible').checked) {
        client.sendArray([{ m: 'chset', set: { visible: true } }]);
    } else {
        client.sendArray([{ m: 'chset', set: { visible: false } }]);
    }
})

document.getElementById('chatEnabled').addEventListener('change', () => {
    if (document.getElementById('chatEnabled').checked) {
        client.sendArray([{ m: 'chset', set: { chat: true } }]);
    } else {
        client.sendArray([{ m: 'chset', set: { chat: false } }]);
    }
})

document.getElementById('color').addEventListener('change', () => {
    client.sendArray([{ m: 'chset', set: { color: document.getElementById('color').value } }])
});

document.getElementById('isSolo').addEventListener('change', () => {
    if (document.getElementById('isSolo').checked) {
        client.sendArray([{ m: 'chset', set: { crownsolo: true } }]);
    } else {
        client.sendArray([{ m: 'chset', set: { crownsolo: false } }]);
    }
})

document.getElementById('sendChat').addEventListener('change', () => {
    if (document.getElementById('sendChat').checked) {
        document.getElementById('sendToChat').addEventListener('keyup', function(e) {
            if (e.key === 'Enter') {
                client.say(document.getElementById('sendToChat').value);
                document.getElementById('sendToChat').value = "";
            }
        });
    }
})

Player.on('endOfFile', end => {
    setTimeout(() => {
        client.sendArray([{ m: "m", x: 3.13, y: 15.07 }]);
    }, 2000)
})

client.on('a', msg => {
    if (document.getElementById('receiveChat').checked == true) {
        document.getElementById('chatLog').textContent += msg.p.name + ': ' + msg.a + '\n';
    }
    if (msg.p._id == client.getOwnParticipant()._id) return;
    if (msg.a.startsWith('/help')) return sendChat('/play, /stop, /skip, /download, /info, /oct, /tempo. Owner: /solo, /buffer, /turns.')
    if (msg.a.startsWith('/info')) return sendChat('Remake of NMPB by Phoenix and Lapis.')
    if (msg.a.startsWith('/play')) {
        octaveEnabled = false;
        if (turns == true) {
            if (msg.p._id == currentUser._id) {
                try {
                    let input = msg.a.substr(6);
                    let midiList = fs.readdirSync("./midis/");
                    if (typeof input == "string" && input == "")
                        sendChat(midiList.join(", "));
                    else {
                        let selectedMidiFileName = midiList
                            .filter(fileName => fileName.toLowerCase().includes(input.toLowerCase()))
                            .random();
                        if (Player.isPlaying()) clearInterval(lolol)
                        Player.stop();
                        Player.loadFile(`./midis/${selectedMidiFileName}`);
                        Player.play();
                        client.sendArray([{ m: "m", x: 3.13, y: 15.07 }]);
                        var lolol = setInterval(() => {
                            if (Player.isPlaying()) {
                                client.sendArray([{ m: "m", x: 100 - (((Player.totalTicks - Player.getCurrentTick()) / Player.division / Player.tempo * 60) / Player.getSongTime() * 100), y: 15.07 }]);
                            }
                        }, 50)

                        sendChat(
                            `Playing ${selectedMidiFileName.slice(
        0,
        selectedMidiFileName.endsWith(".mid")
          ? selectedMidiFileName.length - 4
          : selectedMidiFileName.length
      )}`
                        );
                    }
                } catch (err) {
                    sendChat(
                        err.code == "ENOENT" ?
                        "File not found." :
                        typeof err.message == "string" ?
                        err.message :
                        err
                    );
                }
            }
        } else {
            try {
                let input = msg.a.substr(6);
                let midiList = fs.readdirSync("./midis/");
                if (typeof input == "string" && input == "")
                    sendChat(midiList.join(", "));
                else {
                    let selectedMidiFileName = midiList
                        .filter(fileName => fileName.toLowerCase().includes(input.toLowerCase()))
                        .random();
                    if (Player.isPlaying()) clearInterval(lolol)
                    Player.stop();
                    Player.loadFile(`./midis/${selectedMidiFileName}`);
                    Player.play();
                    origTemp1 = true;
                    client.sendArray([{ m: "m", x: 3.13, y: 15.07 }]);
                    var lolol = setInterval(() => {
                        if (Player.isPlaying()) {
                            client.sendArray([{ m: "m", x: 100 - (((Player.totalTicks - Player.getCurrentTick()) / Player.division / Player.tempo * 60) / Player.getSongTime() * 100), y: 15.07 }]);
                        }
                    }, 50)
                    sendChat(
                        `Playing ${selectedMidiFileName.slice(
        0,
        selectedMidiFileName.endsWith(".mid")
          ? selectedMidiFileName.length - 4
          : selectedMidiFileName.length
      )}`
                    );
                }
            } catch (err) {
                sendChat(
                    err.code == "ENOENT" ?
                    "File not found." :
                    typeof err.message == "string" ?
                    err.message :
                    err
                );
            }
        }
    }
    if (msg.a.startsWith("/download")) {
        octaveEnabled = false;
        if (turns == true) {
            if (msg.p._id == currentUser._id) {
                amount = 0
                let midiumber = Math.floor(Math.random() * 1) + 1000;
                let url = msg.a.substring(10).trim();
                if (!url) sendChat("Usage: /download <url>. For example: https://bitmidi.com/uploads/87216.mid . It needs to have .mid at the end.");
                else {
                    try {
                        require("download-file")(
                            url, {
                                filename: `${midiumber}.mid`,
                                directory: "/midis/"
                            },
                            function callback(err) {
                                if (err) return sendChat(err);
                                try {
                                    Player.stop();
                                    Player.loadFile(`/midis/${midiumber}.mid`);
                                    idle = false;
                                    Player.play();
                                    client.sendArray([{ m: "m", x: 3.13, y: 15.07 }]);
                                    if (Player.isPlaying()) clearInterval(lolol)
                                    sendChat("Downloading...");
                                } catch (error) {
                                    sendChat(error.message || error);
                                    var radius = 50;
                                }
                            }
                        );
                    } catch (error) {
                        sendChat(error.message || error);
                    }
                }
            }
        } else {
            amount = 0
            let midiumber = Math.floor(Math.random() * 1) + 1000;
            let url = msg.a.substring(10).trim();
            if (!url) sendChat("Usage: /download <url>. For example: https://bitmidi.com/uploads/87216.mid . It needs to have .mid at the end.");
            else {
                try {
                    require("download-file")(
                        url, {
                            filename: `${midiumber}.mid`,
                            directory: "/midis/"
                        },
                        function callback(err) {
                            if (err) return sendChat(err);
                            try {
                                Player.stop();
                                Player.loadFile(`/midis/${midiumber}.mid`);
                                idle = false;
                                if (Player.isPlaying()) clearInterval(lolol)
                                Player.play();
                                client.sendArray([{ m: "m", x: 3.13, y: 15.07 }]);
                                sendChat("Downloading...");
                            } catch (error) {
                                sendChat(error.message || error);
                                var radius = 50;
                            }
                        }
                    );
                } catch (error) {
                    sendChat(error.message || error);
                }
            }
        }
    }
    if (msg.a.startsWith('/stop')) {
        octaveEnabled = false;
        if (turns == true) {
            if (msg.p._id == currentUser._id) {
                amount = 0;
                sendChat('Music has stopped.');
                if (Player.isPlaying()) clearInterval(lolol)
                Player.stop();
                client.sendArray([{ m: "m", x: 3.13, y: 15.07 }]);
                return;
            }
        } else {
            amount = 0;
            sendChat('Music has stopped.')
            if (Player.isPlaying()) clearInterval(lolol)
            Player.stop();
            client.sendArray([{ m: "m", x: 3.13, y: 15.07 }]);
            return;
        }
    }
    if (msg.a.startsWith('/skip')) {
        if (msg.p._id == currentUser._id || msg.p._id == "e8297560cbf5248e619fdea0" || msg.p._id == "e8297560cbf5248e619fdea0") {
            sendChat(`Skipped [ ${currentUser._id} ] / ${currentUser.name}'s turn.`);
            turns1();
            if (currentUser._id == client.getOwnParticipant()._id) currentUser = users.random();
            setTimeout(() => {
                sendChat(`[ ${currentUser._id} ] / ${currentUser.name}'s turn. You have 5 minutes.`);
                turnEnabled();
                clearTimeout(lol);
            });
        } else {
            sendChat(`Its not your turn so you cant skip.`);
            return;
        }
    }

    if (msg.a.startsWith('/buffer')) {
        if (msg.p._id == "e8297560cbf5248e619fdea0" || msg.p._id == "e8297560cbf5248e619fdea0") {
            resetChat()
            sendChat('Chat buffer cleared.');
            return;
        }
    }
    if (msg.a.startsWith('/solo')) {
        if (msg.p._id == "e8297560cbf5248e619fdea0") {
            if (solo == true) {
                solo = false;
                sendChat('Solo is off.');
                client.sendArray([{ m: 'chset', set: { crownsolo: false } }]);
            } else {
                solo = true;
                sendChat('Solo is now on.');
                client.sendArray([{ m: 'chset', set: { crownsolo: true } }]);
            }
        }
    }
    if (msg.a.startsWith('/oct')) {
        let input = msg.a.substring(5).trim();
        if (!input) return sendChat('Please enter a valid value.');
        if (isNaN(input)) return sendChat('Invalid value.');
        if (input > 5) return sendChat('Octaves can only go up to 5.');
        octaveAmount = input;
        if (input == 0) {
            octaveEnabled = false;
        } else {
            octaveEnabled = true;
        }
    }
    if (msg.a.startsWith('/tempo')) {
        let input = msg.a.substring(7).trim();
        if (!input) {
            sendChat('Tempo is back to normal.');
            Player.setTempo(origTemp);

        }
        if (isNaN(input)) return sendChat('Invalid value.');
        if (input > 400) return sendChat('Tempo has to be less than 400.');
        Player.setTempo(input);
    }
    if (msg.a.startsWith('/pause')) {
        Player.pause();
    }
    if (msg.a.startsWith('/resume')) {
        Player.play();
    }
    if (msg.a.startsWith('/loop')) {
        Player.playLoop();
        sendChat('Looping the song.')
    }
    if (msg.a.match('/echo') && !msg.a.startsWith('/echod')) {
        let input = msg.a.substring(5).trim();
        if (!input) return sendChat('Please enter a valid value.');
        if (isNaN(input)) return sendChat('Invalid value.');
        if (input > 5) return sendChat('Echo can only go up to 5.');
        echoAmount = input;
        if (echo == true && input == 0) {
            echo = false;
        } else if (echo == false) {
            echo = true;
        }
    }
    if (msg.a.match('/echod')) {
        var input = msg.a.substring(7).trim();
        if (!input) return sendChat('Please enter a valid value.');
        if (isNaN(input)) return sendChat('Invalid value.');
        if (input > 5) return sendChat('Echo Delay can only go up to 5.');
        echoDelay = input;
    }
});