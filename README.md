# Watcher - an app that watches other apps.

In this iteration of the app we have two funtions: "ping" and "hello".

For Homework Assignment #1 the assignment was to create a route that simply responded with a welcome message in json format
to any request to the "/hello" path of the server. This code accomplishes that task.

It is slightly different from the code in the lectures due to stylistic differences in my habits of programming JavaScript, but it is basically the same program.

## Prerequisite
Before running the server you'll need to setup the https cert by running "createcert.cmd". It's a windows cmd file because that's the box I'm using to code this class. You can also source that file into any unix shell and it will work:
```
C:\watcher> .\createcert.cmd
```
OR on UNIX
```
% source ./createcert.cmd
```

You will also need a .twilio.json file. The format is as follows:
```
{
    "accountSid": "<account sid>",
    "authToken": "<auth token>",
    "fromPhone": "+15555555555",
    "testPhone": "+15555555555"
}

## Running the Server
```
node index.js
```
