const WebSocket = require('ws');
const net = require('net');

const wsPort = 8080;
const amiHost = '127.0.0.1';
const amiPort = 5038;
const amiUser = 'php-app';
const amiSecret = 'your_secret';

// Create WebSocket server
const wss = new WebSocket.Server({ port: wsPort });
console.log(`WebSocket server is running on ws://localhost:${wsPort}`);

let activeCalls = {}; // To store active calls
let recentCalls = {}; // To store recent calls
let sipPeers = {}; // To store SIP peers

wss.on('connection', function connection(ws) {
    console.log('Client connected');
    
    // Create AMI connection
    const amiClient = net.createConnection({ host: amiHost, port: amiPort }, () => {
        console.log('Connected to AMI');
        amiClient.write(`Action: Login\r\nUsername: ${amiUser}\r\nSecret: ${amiSecret}\r\n\r\n`);
        amiClient.write(`Action: SIPPeers\r\n\r\n`); // Request SIP peers information
    });

    amiClient.on('data', (data) => {
        const message = data.toString();
        console.log('Received data from AMI');

        if (message.includes('Event: PeerEntry')) {
            // Handle SIP peer entry events
            const lines = message.split('\n');
            let peer = {};
            lines.forEach(line => {
                const [key, value] = line.split(': ');
                if (key && value) {
                    peer[key.trim()] = value.trim();
                }
            });

            if (peer.ChannelType === 'SIP') {
                sipPeers[peer.ObjectName] = peer.Status;
            }
        } else if (message.includes('Event: PeerStatus')) {
            // Handle SIP peer status events
            const lines = message.split('\n');
            let peer = {};
            lines.forEach(line => {
                const [key, value] = line.split(': ');
                if (key && value) {
                    peer[key.trim()] = value.trim();
                }
            });

            if (peer.ChannelType === 'SIP') {
                sipPeers[peer.Peer] = peer.Status;
            }
        } else if (message.includes('Event: Newchannel') || message.includes('Event: Bridge')) {
            // Handle new call or bridge event
            const lines = message.split('\n');
            let channelId = '';
            lines.forEach(line => {
                if (line.startsWith('Channel: ')) {
                    channelId = line.substring('Channel: '.length);
                }
            });

            if (channelId) {
                // Add to active calls
                activeCalls[channelId] = new Date();
                ws.send(JSON.stringify({ type: 'activeCalls', data: Object.keys(activeCalls) }));
            }
        } else if (message.includes('Event: Hangup')) {
            // Handle hangup event
            const lines = message.split('\n');
            let channelId = '';
            lines.forEach(line => {
                if (line.startsWith('Channel: ')) {
                    channelId = line.substring('Channel: '.length);
                }
            });

            if (channelId) {
                // Remove from active calls
                delete activeCalls[channelId];
                ws.send(JSON.stringify({ type: 'activeCalls', data: Object.keys(activeCalls) }));

                // Handle recent calls
                recentCalls[channelId] = new Date(); // Store end time
            }
        }

        // Send all users and active users to the client
        const allUsers = Object.keys(sipPeers);
        const activeUsers = allUsers.filter(peer => sipPeers[peer] === 'Reachable');
        ws.send(JSON.stringify({ type: 'allUsers', data: allUsers }));
        ws.send(JSON.stringify({ type: 'activeUsers', data: activeUsers }));
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

    // Send recent calls to the client
    setInterval(() => {
        const now = new Date();
        const recentCallsList = Object.keys(recentCalls).filter((channelId) => {
            return (now - recentCalls[channelId]) < 15 * 60 * 1000; // Last 15 minutes
        });
        ws.send(JSON.stringify({ type: 'recentCalls', data: recentCallsList }));
    }, 60000); // Check every minute
});
