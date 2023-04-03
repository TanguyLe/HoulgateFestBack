# HoulgateFest - Back

This repository hosts the code for the backend of the HoulgateFest website. It is a full Javascript application
written in node.js + express, with
authentication/logging and whose main feature is to be able to "shotgun" (reserve) a room in a house.

It is meant to work alongside its frontend : https://github.com/TanguyLe/HoulgateFestFront.

## Installation

### Prerequisites

1. Node and npm installed, recommended versions are node 12.13.1 and npm 6.12.1.
2. Repo cloned.
3. MongoDB installed and started, recommended version is 4.2. You can also use a remote mongodb.

### Packages

Just use `npm install` within the project directory and you're good to go !

## Usage

### Env variables setting

All the scripts try to fetch their env variables from env files named as `back-<env>-env.env`
(env being `dev`, `test` or `prod`).
For `dev` scripts, those files are overridden by the env variables defined when running the script,
for `test`/`prod` environments the files take the priority.
So to set an env variable for all environments you can change the content of those files,
and only in `dev` environments you can set them from outside.

The `prod` and `test` env files are obviously not available on github,
ask the project owner if you need them.

### Setup

This part mostly apply to `dev` environments but would work the same for any.

-   If you use a local mongodb, make sure the service for the db runs by using `sudo service mongod start`
-   Set `MONGO_CONNECTION` at the mongo uri before running any script
    (in `dev` the current value in the env file is `mongodb://localhost/Userdb`)
-   If you plan to use emails, you have to set `GMAIL_USER` and `GMAIL_PASSWORD`

You may want to perform the DB operations 1 to 3 before starting if you use a fresh db (see below).
The following commands are all defined using npm scripts from the package.json.

All the backend servers are served by default at `http://localhost:3000/`.

### Database operations

1. `npm run initDB`: Fills the db with the data of the house (rooms) and the editions.
   To be executed only once (static data).
2. `npm run createTestRecords`: Fills the db with some test records
   (users & trips) whose data is [here](./scripts/scriptsUtils.js).
3. `npm run removeTestRecords`: Cleans the db by removing eventual
   test records (users, shotguns & trips from test users).
4. `npm run removeTestShotguns`: Removes only test shotguns.
5. `npm run historizeShotguns`: To remove actual shotguns and historize them.

A developer would usually do 1 only once, sometimes 2-3 and often 4 to retry new shotgun combinations.

### Run

#### `dev`

1. `npm run dev`: Hot-reloading web server for development.
2. `npm run devStartShotgun`: The same as 1, but modified so that shotguns are possible even
   if the shotgun date is not reached.

#### `prod`

1. `npm run start` Starts a production server on the prod environment

#### `test`

1. `npm run startTest` Starts a production server on the test environment
