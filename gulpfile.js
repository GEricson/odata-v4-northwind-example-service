var gulp = require('gulp');

const config = require('config');

const mongoose = require('mongoose');
const initDb = require('./controllers/odata').initDb

gulp.task('initDb', function (done) {
    //reuse middleware
    initDb({}, {
        sendStatus: () => {
            //success

            mongoose.connection.close()
            console.log('Done')
            done() 
        },
        send: (err) => {
            //error

            mongoose.connection.close()
            console.log(err);
            done();
        }
    })
});