<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard</title>
    <link rel="stylesheet" href="/home/bicom/Desktop/AMI/semantic.min.css">
    <style>
        body {
            background-color: #d9dedb;
        }

        .sidebar {
            width: 200px;
            position: fixed;
            top: 0;
            left: 0;
            height: 100%;
            background-color: #1b1c1d;
        }

        .main-content {
            margin-left: 200px;
            padding: 20px;
        }

        .header {
            background-color: #ff6f61;
            color: white;
            text-align: center;
            font-size: 20px;
            margin-bottom: 20px;
            border-radius: 5px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
        }

        .card-container {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
        }

        .custom-card {
            width: 30%;
            border: 2px solid #ff6f61;
            border-radius: 5px;
            padding: 20px;
            padding-bottom: 200px;
            background-color: white;
            text-align: center;
            color: #ff6f61;
            font-weight: bold;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        }

        .activities-list {
            width: 98%;
            border: 2px solid #ff6f61;
            border-radius: 5px;
            padding: 20px;
            padding-bottom: 200px;
            background-color: white;
            text-align: center;
            color: #ff6f61;
            font-weight: bold;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
            margin: 0 auto;
        }

        .item {
            color: white;
            margin-bottom: 10px;
            text-align: center;
            border-bottom: #d9dedb;
            border-bottom: 2px solid #d9dedb;
        }

        .content {
            display: fixed;
            text-align: left;
            color: black;
            font-size: 20px;
        }
    </style>
</head>

<body>
    <div class="ui vertical menu sidebar">
        <div class="item">
            <h2 class="ui header" style="color: white;">MON AMI</h2>
        </div>
        <p class="item">Dashboard</p>
        <p class="item">Users</p>
    </div>
    <div class="main-content">
        <h1>Dashboard</h1>
        <div class="ui three stackable cards card-container">
            <div class="ui card custom-card">
                <div class="content">
                    <div class="header">All Users</div>
                    <?php
                    $file_content = file_get_contents('/etc/asterisk/extensions.conf');
                    preg_match('/\[globals\](.*?)\n\[/s', $file_content, $matches);
                    if (isset($matches[1])) {
                        echo nl2br(htmlspecialchars(trim($matches[1])));
                    } else {
                        echo 'No [globals] section found.';
                    }
                    ?>
                </div>
            </div>
            <div class="ui card custom-card">
                <div class="content">
                    <div class="header">Active Users</div>
                    <?php
                    // AMI connection details
                    $manager_host = "127.0.0.1";
                    $manager_port = 5038;
                    $manager_username = "php-app";
                    $manager_secret = "your_secret";

                    // Connect to AMI
                    $socket = fsockopen($manager_host, $manager_port, $errno, $errstr, 30);
                    if (!$socket) {
                        echo "Error: $errstr ($errno)<br />\n";
                    } else {
                        // Login to AMI
                        fputs($socket, "Action: Login\r\n");
                        fputs($socket, "Username: $manager_username\r\n");
                        fputs($socket, "Secret: $manager_secret\r\n\r\n");

                        // Wait for the response
                        $response = fread($socket, 4096);

                        if (strpos($response, 'Authentication accepted') === false) {
                            echo "Error: Authentication failed.<br />\n";
                        } else {
                            // Request SIP peers
                            fputs($socket, "Action: SIPpeers\r\n\r\n");

                            // Wait for the response
                            $peers = '';
                            while ($line = fgets($socket)) {
                                $peers .= $line;
                                // End of response
                                if (strpos($line, '--END COMMAND--') !== false) {
                                    break;
                                }
                            }

                            // Parse and display active users
                            $lines = explode("\n", $peers);
                            foreach ($lines as $line) {
                                if (strpos($line, 'OK') !== false) {
                                    echo "Active User: " . htmlspecialchars(trim($line)) . "<br />";
                                }
                            }
                        }

                        // Logout and close the connection
                        fputs($socket, "Action: Logoff\r\n\r\n");
                        fclose($socket);
                    }
                    ?>
                </div>
            </div>
            <div class="ui card custom-card">
                <div class="content">
                    <div class="header">Active Calls</div>
                </div>
            </div>
        </div>
        <div class="ui segment">
            <h2 style="color: red;">Recent Activities</h2>
            <div class="ui list activities-list">
            </div>
        </div>
        <div class="ui segment">
            <h2 style="color: red;">Active Calls</h2>
            <div class="ui list activities-list">
                
            </div>
        </div>
    </div>

    <script src="/home/bicom/Desktop/AMI/jquery.min.js"></script>
    <script src="/home/bicom/Desktop/AMI/semantic.min.js"></script>
</body>

</html>
