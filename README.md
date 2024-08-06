ASTERISK MANAGER INTERFACE (AMI)
--------------------------------



**WHAT TO DO**
--------------

The idea for this application is to create a simple dashboard that will track the number of Users (total number of asterisk Extensions), the number of active users (number of registered Extensions) and ongoing calls. 

The GUI should be simple and must be done using SEMANTIC UI framework. The application must not use a database, all the data must be shown in real-time.

There are no programming language limitations for this application, any language can be used. AMI framework usage is nor allowed (for example PAMI for PHP, node-asterisk for node.js etc.). The application must connect to the asterisk manager interface directly (see manager.conf) and handle the asterisk events properly.


**IMPLEMENTATION**
------------------

For this application, we used: 
    - HTML, CSS, JavaScript, NodeJS (programming languages), 
    - SEMANTIC UI (framework),
    - Zoiper5 and Twinkle (softphones)

ABOUT THE APPLICATION: 
    We use two softphones to establish communication between them. When the server is started, on the specified port, the 'allUsers' section contains all users who are  on Asterisk in the extensions.conf file. When one of the softphones or users registers, meaning their status changes to 'Reachable', that user appears in the 'active users' section. Similarly, when a user unregisters from Asterisk, meaning their status changes to 'Unreachable', they are removed from the 'active users' section. Once we have registered users, when a call is established, it is recorded in the 'active Calls' section, and certain details are tracked (call duration, start time, caller's extension, called extension). When the call ends, it is removed from the 'active Calls' section and moves to the 'recent activities' section, which tracks the last activities in the past 15 minutes (this time interval can be changed). For the implementation of this application, we used Node.js to implement the system's logic, and for the application's display, we used HTML, CSS, JavaScript, and the Semantic UI framework.

ABOUT THE IMPLEMENTATION:
    All code is written in two files (server.js and main.html).
    You can find all the details about the code in the 'AMI(Asterisk Manager Interface)' (obsidian file) in 'AMI_readme' folder.


