const WebSocket = require('ws');
const fs = require('fs');
const net = require('net');

const wsPort = 8080;
const amiHost = '127.0.0.1';
const amiPort = 5038;
const amiUser = 'php-app';
const amiSecret = 'your_secret';
const filePath = '/etc/asterisk/extensions.conf';

function parseSoftphones(fileContent) {
    const globalsSection = '[globals]';
    const lines = fileContent.split('\n');
    let isInGlobalsSection = false;
    const softphones = {};

    for (const line of lines) {
        const trimmedLine = line.trim();

        if (trimmedLine.startsWith(globalsSection)) {
            isInGlobalsSection = true;
            continue;
        }

        if (trimmedLine.startsWith('[') && trimmedLine !== globalsSection) {
            isInGlobalsSection = false;
        }

        if (isInGlobalsSection && trimmedLine && !trimmedLine.startsWith(';')) {
            const [key, value] = trimmedLine.split('=').map(part => part.trim());
            if (key && value) {
                if (value.startsWith('PJSIP')) {
                    softphones[key] = value;
                }
            }
        }
    }

    return softphones;
}

const wss = new WebSocket.Server({ port: wsPort });
console.log(`WebSocket server is running on ws://localhost:${wsPort}`);

let activeCalls = {};
let recentCalls = {};
let sipPeers = {};
let softphones = {};

function sendToClients(type, data) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type, data }));
        }
    });
}

fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
        console.error(`Error reading file: ${err.message}`);
        return;
    }

    softphones = parseSoftphones(data);
    console.log('Softphones:', softphones);
    sendToClients('allUsers', Object.keys(softphones));
});

fs.watch(filePath, (eventType) => {
    if (eventType === 'change') {
        console.log('File change detected');
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                console.error(`Error reading file: ${err.message}`);
                return;
            }

            softphones = parseSoftphones(data);
            console.log('Updated Softphones:', softphones);
            sendToClients('allUsers', Object.keys(softphones));
        });
    }
});

wss.on('connection', function connection(ws) {
    console.log('Client connected');

    const amiClient = net.createConnection({ host: amiHost, port: amiPort }, () => {
        console.log('Connected to AMI');
        amiClient.write(`Action: Login\r\nUsername: ${amiUser}\r\nSecret: ${amiSecret}\r\n\r\n`);
        amiClient.write(`Action: SIPPeers\r\n\r\n`);
    });

    amiClient.on('data', (data) => {
        const message = data.toString();
        console.log('Received data from AMI');

        if (message.includes('Event: PeerEntry') || message.includes('Event: PeerStatus')) {
            const lines = message.split('\n');
            let peer = {};
            lines.forEach(line => {
                const [key, value] = line.split(': ');
                if (key && value) {
                    peer[key.trim()] = value.trim();
                }
            });

            if (peer.ChannelType === 'SIP') {
                sipPeers[peer.Peer || peer.ObjectName] = peer.Status;
            }
        } else if (message.includes('Event: Newchannel') || message.includes('Event: Bridge')) {
            const lines = message.split('\n');
            let channelId = '';
            let dialer = '';
            let recipient = '';
            lines.forEach(line => {
                if (line.startsWith('Channel: ')) {
                    channelId = line.substring('Channel: '.length);
                }
                if (line.startsWith('CallerIDNum: ')) {
                    dialer = line.substring('CallerIDNum: '.length);
                }
                if (line.startsWith('ConnectedLineNum: ')) {
                    recipient = line.substring('ConnectedLineNum: '.length);
                }
            });

            if (channelId) {
                activeCalls[channelId] = { dialer, recipient, startTime: new Date() };
                sendToClients('activeCalls', activeCalls);
            }
        } else if (message.includes('Event: Hangup')) {
            const lines = message.split('\n');
            let channelId = '';
            lines.forEach(line => {
                if (line.startsWith('Channel: ')) {
                    channelId = line.substring('Channel: '.length);
                }
            });

            if (channelId && activeCalls[channelId]) {
                const callStartTime = activeCalls[channelId].startTime;
                const callDuration = Math.round((new Date() - callStartTime) / 1000); // Duration in seconds

                // Add to recent calls
                recentCalls[channelId] = {
                    ...activeCalls[channelId],
                    duration: callDuration,
                    timestamp: new Date()
                };
                delete activeCalls[channelId];

                // Remove old entries from recent calls
                const now = new Date();
                Object.keys(recentCalls).forEach(callId => {
                    if ((now - recentCalls[callId].timestamp) > 15 * 60 * 1000) { // 15 minutes
                        delete recentCalls[callId];
                    }
                });

                sendToClients('activeCalls', activeCalls);
                sendToClients('recentCalls', Object.values(recentCalls));
            }
        }

        const allUsers = Object.keys(sipPeers);
        const activeUsers = allUsers.filter(peer => sipPeers[peer] === 'Reachable');
        sendToClients('allUsers', Object.keys(softphones));
        sendToClients('activeUsers', activeUsers);
    });

    amiClient.on('end', () => {
        console.log('Disconnected from AMI');
    });

    ws.on('message', (message) => {
        console.log(`Received message from client: ${message}`);
        amiClient.write(message + '\r\n');
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        amiClient.end();
    });

    ws.on('error', (error) => {
        console.error(`WebSocket error: ${error.message}`);
    });

    setInterval(() => {
        const now = new Date();
        const recentCallsList = Object.keys(recentCalls).filter((channelId) => {
            return (now - recentCalls[channelId].timestamp) < 15 * 60 * 1000;
        });
        sendToClients('recentCalls', recentCallsList.map(id => ({
            id,
            ...recentCalls[id]
        })));
    }, 60000);
});
