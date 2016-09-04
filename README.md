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
    - Compact  : Web Skype, but contacts user less space
    - Dark : Ghetto Skype's Dark Theme
    - Dark Compact: Ghetto Skype's Dark Theme, but with compact contact list.    
- Code highlight for more than 166 programming languages (using [highlight.js](https://highlightjs.org/)) with 66+ styles

Credits to [Ghetto Skype](https://github.com/stanfieldr/ghetto-skype/) for the idea of using electron and
themes. In fact, the Dark Theme is basically a copy of Ghetto's dark theme.

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

# User Guide

## Keyboard shortcuts

| Key binding     |                                     |
|-----------------|-------------------------------------|
| CTRL+G          | opens the latest unread message     |
| CTRL+F          | opens the search box                |
| CTRL+K          | focus the contact/user search field |
| ALT+Left Arrow  | Focus previous contact              |
| ALT+Right Arrow | Focus next contact                  |

## Code highlight

Code highlight only works among other Octane Users. To highlight code, start the message with three backticks:
````
  ```
````

Regular skype users will see the backticks and the text without any format.

## Search

The search box can be used to search text that is already present in the history. So, if the history wasn't 
loaded yet, it won't be able to find it. You have to scroll up until you load more history to improve the 
search results.

# Developer Guide

## Running from the source code

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

## Packaging for debian, windows and mac

The following command will create the package only for the running platform:

```
npm run release
```

The release files will be under directory *dist*.
