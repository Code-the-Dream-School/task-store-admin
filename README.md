# Task Store Administration

These utilities provide administrative capabilities for the CTD task store database.

Prerequisite: You must install Node and npm first.

To set it up, clone this repository, change to the repository directory, and run `npm install`. Then obtain the database URL and reset URL. These must be added to a .env file in the repository directory, viz:

```
DATABASE_URL=postgresql://somethingSomethingSomething
RESET_URL=https://something
```

Sometime during a CTD Reat class, someone, maybe the CIL, will get a list of the github usernames for each student and mentor.  These are entered into a text file.  The command:

```bash
node enroll <filename>
```

adds each of these to a list of users with "origin" authorization for the tasks store.  During the React class, students may deploy their apps, which use the task store as a REST back end.  Therefore the list of origins in the task store CORS configuration must be updated with the origin of the student's deployed app, or the REST calls will fail.  After a student has been authorized with the enroll utility, that student can register the origin of their deployed app using the UI at

```
https://<task store url>/origin
```

Eventually, the task store will fill up with obsolete entries in the User, Task, classRoll, and Origin tables.  Someone can then run

```bash
node cleanup
```

To empty some or all of these tables.