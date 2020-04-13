# HoulgateFest - Back

This repository hosts the code for the backend of the HoulgateFest website. It is a full Javascript application
written in node.js + express, with
authentication/logging and whose main feature is to be able to "shotgun" (reserve) a room in a house.

It is meant to work alongside its frontend : https://github.com/TanguyLe/HoulgateFestFront.

## Installation
### Prerequisites
1. Node and npm installed, recommended versions are node 12.13.1 and npm 6.12.1.
2. Repo cloned.
3. MongoDB installed and started, recommended version is 3.6.17.
4. Get the credential files from the project's owner. (those are secret files not hosted on git)

### Packages
Just use `npm install` within the project directory and you're good to go !

## Usage
Make sure the service for the db runs by using `sudo service mongod start`.

You may want to perform the DB operations 1 to 3 before starting (see below).

The following commands are all defined using npm scripts from the package.json.

All the backend servers are served by default at http://localhost:3000/.

### Database operations
1. `npm run initDB`: Fills the db with the data of the house (rooms).
2. `npm run createTestUsers`: Fills the db with some test users whose data is [here](./scripts/scriptsUtils.js).
3. `npm run fillEditions`: Fills the db with the editions' data.
4. `npm run cleanDB`: Cleans the db by removing eventual test users and all the shotguns (leaving editions and rooms).
5. `npm run cleanShotguns`: Cleans your db by removing only the shotguns.

A developer would usually do 1 to 3 only once and often use 5 to re-start new shotgun combinations.

### Development
1. `npm run dev`: Hot-reloading web server for development.
2. `npm run devStartShotgun`: The same as 1, but modified so that shotguns are possible even
if the shotgun date is not reached.

#### Prod
1. `npm run start` Starts a production server.
