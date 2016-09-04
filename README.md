# Octane Skype

Are you sick of using a subpar skype for linux that lacks even some of the basic features, such
as text search and code highlight? 

Then, it's Octane Skype to the rescue! Octane comes to leverage your skype experience with lots
of nice features!

Features:

- Unread thread count in the tray icon
- Several keyboard shortcuts
- Clicking the notifications brings the client to front
- When you focus the client, the keyboard focus is where you expect, in the chat box!
- The tray icon color reflects the user state (such as idle, busy and so on)
- Text search
- Introducing new themes 
- Code highlight for more than 166 programming languages (using https://highlightjs.org/) with 66+ styles

# Installation instructions

Ubuntu users:

```
sudo add-apt-repository ppa:g-takeuchi/octane-skype
sudo apt-get update
sudo apt-get install octane-skype
```

Other debian users, configure the following apt-get source:

```
deb http://ppa.launchpad.net/g-takeuchi/octane-skype/ubuntu wily main 
deb-src http://ppa.launchpad.net/g-takeuchi/octane-skype/ubuntu wily main 
```

# Running from the source code

Make sure you have the latest nodejs version:

```
curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash -
sudo apt-get install -y nodejs
```

Run npm to install application requirements:
```
npm install
```

And to execute the application:

```
npm start
```

# Packaging for debian, windows and mac

The following command will create the package only for the running platform:

```
npm run release
```

The release files will be under directory *dist*.
