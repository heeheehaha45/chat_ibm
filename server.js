var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var md5 = require("blueimp-md5");

var os = require('os');

var bodyParser = require('body-parser');

const nodemailer = require('nodemailer');

var cfenv = require("cfenv");
var mydb;

var expressSession = require('express-session'),
    cookieParser = require('cookie-parser');


const crypto = require('crypto');

formidable = require('formidable'),
    fs = require('fs'),
    path = require('path');


//var domain = "http://localhost:3000";
//var domain = "https://getstartednode-smart-grysbok.mybluemix.net";
var domain = "https://circleio.mybluemix.net";

console.log("domain=" + os.hostname());




// set the view engine to ejs
app.set('view engine', 'ejs');

app.use("/static", express.static(__dirname + '/static'));


app.use(cookieParser());
app.use(expressSession({
    secret: 'mYsEcReTkTy',
    resave: true,
    saveUninitialized: true
})); // I haven't used the session store




var urlencodedParser = bodyParser.urlencoded({
    extended: false
})


//db connection-------------------------------


//database name
var dbName = 'users';


var vcapLocal;
try {
    vcapLocal = require('./vcap-local.json');
    console.log("Loaded local VCAP", vcapLocal);
} catch (e) {}

const appEnvOpts = vcapLocal ? {
    vcap: vcapLocal
} : {}

const appEnv = cfenv.getAppEnv(appEnvOpts);

if (appEnv.services['cloudantNoSQLDB'] || appEnv.getService(/cloudant/)) {
    // Load the Cloudant library.
    var Cloudant = require('cloudant');

    // Initialize database with credentials
    if (appEnv.services['cloudantNoSQLDB']) {
        // CF service named 'cloudantNoSQLDB'
        var cloudant = Cloudant(appEnv.services['cloudantNoSQLDB'][0].credentials);
    } else {
        // user-provided service with 'cloudant' in its name
        var cloudant = Cloudant(appEnv.getService(/cloudant/).credentials);
    }



    // Create a new "mydb" database.
    /* cloudant.db.create(dbName, function(err, data) {
    if(!err) //err if database doesn't already exists
      console.log("Created database: " + dbName);
  });
*/
    // Specify the database we are going to use (mydb)...
    mydb = cloudant.db.use(dbName);
}



//end of db connection-----------------------------


app.get('/', function (req, res) {
    console.log("inside root:" + req.session.userId);
    req.session.userId = "1234";


    res.redirect('/login');
});

app.get('/logout', function (req, res) {
    req.session.destroy();

    res.redirect('/login');
});



app.get('/login', function (req, res) {
    var info = req.query.info;
    var error = req.query.error;

    if (typeof error == "undefined")
        error = "";
    //console.log("inside login:"+req.session.userId);


    if (typeof info != 'undefined')
        info = info;

    else
        info = "";

    res.render('pages/login', {
        info: info,
        error: error
    });





});

app.get('/signup', function (req, res) {
    var error = req.query.error;
    res.render('pages/signup', {
        error: error

    });

});



app.get('/upload_profile_pic', function (req, res) {


    res.render('pages/upload_profile_pic', {
        t: "a5IzlBe2mLKROYUkXE9hAFiUcML5De"

    });

});


app.get('/activated', function (req, res) {

    res.render('pages/activated');

});


app.get('/error', function (req, res) {

    res.render('pages/error');

});


app.get('/preview/', function (req, res) {
    var id = req.query.picId;
    // var id = "1XJsLks1lGMS1vaVvBsfvJLuaOa0L4";
    var filename = "profile_pic";
    var content_type;
    var ext;
    mydb.list({
        include_docs: true
    }, function (err, body) {
        if (!err) {
            var found = false;
            var token;
            body.rows.forEach(function (row) {
                if (row.doc._id === id) {

                    found = true;
                    content_type = row.doc._attachments.profile_pic.content_type;
                    ext = content_type.substr(content_type.length - 3);
                    filename = filename;
                }
            });
            console.log("found=" + found);

            if (found) {

                // create a readableStream from the doc's attachment
                var readStream = mydb.attachment.get(id, filename, function (err) {
                    // note: no second argument
                    // this inner function will be executed 
                    // once the stream is finished
                    // or has failed
                    if (err)
                        return console.dir(err)
                    else
                        console.dir('the stream has been successfully piped')
                })
                // set the appropriate headers here
                res.setHeader("Content-Type", "image/" + ext);

                // pipe the attachment to the client's response
                readStream.pipe(res);






            } else {
                //res.render('pages/error');
                res.status(404)        // HTTP status 404: NotFound
                   .send('Not found');
            }
        } //endif
        else {
            console.log(err);
        }
    });









})



app.get('/uploadPage', function (req, res) {

    res.render('pages/uploadPage');

});

function blah() {

    // Build an instance of a writable stream in object mode.
    var receiver__ = require('stream').Writable({
        objectMode: true
    });

    receiver__._write = function onFile(__newFile, _unused, done) {
        __newFile.pipe(db.attachment.insert(__newFile.filename, __newFile.filename, null, __newFile.headers["content-type"]));

        __newFile.on("end", function (err, value) {
            console.log("finished uploading", __newFile.filename);
            done();
        });

    };

    return receiver__;
}


app.get("/reset_pw_process", function (req, res) {

    var code = req.query.code;
    var pw = req.query.pw;

    mydb.list({
        include_docs: true
    }, function (err, body) {
        if (!err) {
            var found = false;

            body.rows.forEach(function (row) {
                if (row.doc.type === "user" && row.doc.activate_code === code) {
                    user = row.doc;
                    found = true;

                }
            });
            console.log("found=" + found);

            if (found) {
                user.pw = pw;

                mydb.insert(user, function (err, body, header) {
                    if (err) {
                        console.log('[mydb.insert] ', err.message);
                        res.send("Error");
                    }
                    res.redirect('/login?infoMsg=Your password has been reset.');       
                });

            } else {
                res.render('pages/error');

            }
        } //endif
        else {
            console.log(err);
        }
    });




   

});


app.get("/reset_pw", function (req, res) {

    var code = req.query.code;

    res.render('pages/reset_pw', {
        code: code
    });

});

app.get("/forget_pw", function (req, res) {


    res.render('pages/forget_pw');


});




app.get("/send_pw_email", function (req, res) {
    //a picId is required to /update_profile_page?picId=xxxx

    var email = req.query.email;

    //find the user
    if (!mydb) {
        //response.json(names);
        return;
    }

    mydb.list({
        include_docs: true
    }, function (err, body) {
        if (!err) {
            var found = false;

            body.rows.forEach(function (row) {
                if (row.doc.type === "user" && row.doc.email === email) {
                    user = row.doc;
                    found = true;

                }
            });
            console.log("found=" + found);

            if (found) {
                //send email
                var smtpTransport = nodemailer.createTransport({
                    host: 'smtp.gmail.com',
                    port: 465,
                    secure: true, // use SSL
                    auth: {
                        user: 'thesocialcircleappnoreply@gmail.com',
                        pass: '8yq38cbf'
                    }
                });


                var link = domain + "/reset_pw?code=" + user.activate_code;
                emailHTML='<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd"><html xmlns="http://www.w3.org/1999/xhtml">    <head>        <meta http-equiv="Content-Type" content`="text/html; charset=UTF-8" />        <title></title>        <style></style>    </head>    <body>        <table border="0" cellpadding="0" cellspacing="0" height="100%" width="100%" id="bodyTable">            <tr>                <td align="center" valign="top">                    <table border="0" cellpadding="20" cellspacing="0" width="600" id="emailContainer">                        <tr>                            <td align="center" valign="top">                                <img src="https://i.imgur.com/HkFS37I.jpg" width= "100px" style= "border: none; display: block; outline: none; width: 100px; opacity: 1; max-width: 100%;">                                <br>Dear, Dear user, Please click the following link to reset your password:<br> Please click the following link: <br><a href="' + link + '">link to reset</a></td></tr></table></td></tr></table></body></html>';
                // setup e-mail data with unicode symbols
                var mailOptions = {
                    from: "thesocialcircleappnoreply@gmail.com", // sender address
                    to: email, // list of receivers
                    subject: "Reset of password of your account", // Subject line
                    text: "Dear user, Please click the following link to reset your password: " + link, // plaintext body
                    html: emailHTML // html body
                }

                // send mail with defined transport object
                smtpTransport.sendMail(mailOptions, function (error, response) {
                    if (error) {
                        console.log(error);
                    } else {
                        console.log("Message sent: " + response.message);
                    }

                    // if you don't want to use this transport object anymore, uncomment following line
                    //smtpTransport.close(); // shut down the connection pool, no more messages
                });



                res.redirect('/chatroom');



            } else {
                res.redirect('/chatroom');

            }
        } //endif
        else {
            console.log(err);
        }
    });



});




app.get("/update_profile_data_page", function (req, res) {

    var token = req.query.token;
    var found = false;
    var user;

    if (!mydb) {
        //response.json(names);
        return;
    }

    mydb.list({
        include_docs: true
    }, function (err, body) {
        if (!err) {
            var found = false;

            body.rows.forEach(function (row) {
                if (row.doc.type === "user" && row.doc.token === token) {
                    user = row.doc;
                    found = true;

                }
            });
            console.log("found=" + found);

            if (found) {
                user.description;


                user.nickname;
                user.interest;
                user.description;
                //user.pw="123";

                res.render('pages/update_profile_data_page', {
                    token: req.query.token,
                    nickname_old: user.name,
                    interest_old: user.interest,
                    description_old: user.description
                });



            } else {
                res.render('pages/error');

            }
        } //endif
        else {
            console.log(err);
        }
    });





});

app.get("/update_profile_page", function (req, res) {
    //a picId is required to /update_profile_page?picId=xxxx


    res.render('pages/update_profile_page', {
        picId: req.query.picId,
        err: req.query.err,
        token: req.query.token
    });


});


app.post("/update_profile_data", urlencodedParser, function (req, res) {

    var token = req.body.token;
    var name = req.body.name;
    var interest = req.body.interest;
    var description = req.body.description;

    var user;
    if (!mydb) {
        //response.json(names);
        return;
    }

    mydb.list({
        include_docs: true
    }, function (err, body) {
        if (!err) {
            var found = false;

            body.rows.forEach(function (row) {
                if (row.doc.type === "user" && row.doc.token === token) {
                    user = row.doc;
                    found = true;

                }
            });
            console.log("found=" + found);

            if (found) {
                user.name = name;
                user.interest = interest;
                user.description = description;
                //user.pw="123";
                mydb.insert(user, function (err, body, header) {
                    if (err) {
                        console.log('[mydb.insert] ', err.message);
                        res.send("Error");
                    }
                    res.redirect('/chatroom?t=' + token);
                });

            } else {
                res.render('pages/error');

            }
        } //endif
        else {
            console.log(err);
        }
    });




});



app.post("/update_profile", function (req, res) {
    //todo: delete the old profilepic and create a new one


    //delete old profile pic


    //////////

    var token;
    var picId;
    var id;
    var rev;
    var form = new formidable.IncomingForm();
    //The default size is 200MB.  form.maxFileSize = 200 * 1024 * 1024;
    form.maxFileSize = 2 * 1024 * 1024;
    console.log("form.maxFileSize=" + form.maxFileSize);

    form.parse(req, function (err, fields, files) {
        picId = fields.picId;
        token = fields.token;
        
        if (err) {
            console.log(err);
            res.redirect('/update_profile_page?picId=' + picId + '&token='+token+'&err=fileSize');
            return;

        }

        // `file` is the name of the <input> field of type `file`
        var old_path = files.file.path,
            file_size = files.file.size,
            file_ext = files.file.name.split('.').pop(),
            file_ext = file_ext.toLowerCase();


        index = old_path.lastIndexOf('/') + 1,
            file_name = old_path.substr(index);
        console.log(file_ext);

        if (file_ext !== "jpg" && file_ext !== "png" && file_ext !== "gif") {
            console.log("file is not picture type");
            //error
            res.redirect('/update_profile_page?picId=' + picId + '&token='+token+'&err=picType');
            return;
        }





        //delete the old attachment
        (function () {
            // var picId = req.query.picId;
            var id;
            var rev;

            console.log("picId=" + picId);

            //find the rev from the picId
            mydb.list({
                include_docs: true
            }, function (err, body) {
                if (!err) {
                    var found = false;

                    body.rows.forEach(function (row) {
                        if (row.doc._id === picId) {
                            found = true;
                            rev = row.doc._rev;
                        }
                    });
                    //delete the record if found
                    if (found) {
                        console.log("rev=" + rev);
                        mydb.destroy(picId, rev, function (err, body) {
                            if (!err)
                                console.log(body);
                            else
                                console.log(err);
                        });

                        //new attachment
                        fs.createReadStream(old_path).pipe(

                            mydb.attachment.insert(picId, 'profile_pic', null, 'image/' + file_ext, {
                                _rev: rev
                            }, function (err, body) {

                                if (!err)
                                    console.log(body);
                                else
                                    console.log(err);

                                res.render('pages/update_profile_page', {
                                    picId: picId,
                                    err: "",
                                    token:token
                                });

                            })

                        );
                        /////////

                    } else {
                        //***change to upload file if the file is not found

                        fs.createReadStream(old_path).pipe(

                            mydb.attachment.insert(picId, 'profile_pic', null, 'image/' + file_ext, {
                                _rev: rev
                            }, function (err, body) {

                                if (!err)
                                    console.log(body);
                                else
                                    console.log(err);

                                res.render('pages/update_profile_page', {
                                    picId: picId,
                                    err: "",
                                    token: token

                                });

                            })

                        );
                        //res.redirect('/error');
                    }

                } //endif
                else {
                    console.log(err);
                }
            });

        })();



        ///////////



    });

});

app.post("/upload_process", function (req, res) {
    var picId;
    var id;
    var rev;
    var form = new formidable.IncomingForm();


    form.parse(req, function (err, fields, files) {
        // `file` is the name of the <input> field of type `file`
        var old_path = files.file.path,
            file_size = files.file.size,
            file_ext = files.file.name.split('.').pop(),
            file_ext = file_ext.toLowerCase();


        index = old_path.lastIndexOf('/') + 1,
            file_name = old_path.substr(index);
        console.log(file_ext);
        picId = fields.picId;

        fs.createReadStream(old_path).pipe(

            mydb.attachment.insert(picId, 'profile_pic', null, 'image/' + file_ext, {
                _rev: rev
            }, function (err, body) {

                if (!err)
                    console.log(body);
                else
                    console.log(err);

                res.render('pages/login', {
                    info: ""

                });
            })

        );

    });


});





app.post("/upload", function (req, res) {
    /*
    console.log((request.file));
    var stream = request.file("file").pipe(blah());
    stream.on("finish", function () { response.redirect("/") });
    */
    var form = new formidable.IncomingForm();
    console.log("form.maxFields=" + form.maxFields);

    form.parse(req, function (err, fields, files) {
        // `file` is the name of the <input> field of type `file`
        var old_path = files.file.path,
            file_size = files.file.size,
            file_ext = files.file.name.split('.').pop(),
            index = old_path.lastIndexOf('/') + 1,
            file_name = old_path.substr(index);
        //new_path = path.join(process.env.PWD, '/uploads/', file_name + '.' + file_ext);


        fs.createReadStream(old_path).pipe(

            mydb.attachment.insert('users4', 'rabbit.png', null, 'image/png', {
                _rev: '51-3bfc7f5cd83d1efadd23122a99710eda'
            }, function (err, body) {
                if (!err)
                    console.log(body);
                else
                    console.log(err);


                res.render('pages/uploadPage');

            })

        );


        /*
        fs.readFile(old_path, function (err, data) {

            if (!err) {
                mydb.attachment.insert('users', 'rabbit.png', data, 'image/png', {
                    rev: '51-3bfc7f5cd83d1efadd23122a99710eda'
                }, function (err, body) {
                    if (!err)
                        console.log(body);
                });
            }

        });

        */


    });


});









app.get('/upload_old', function (req, res) {
    const AWS = require('ibm-cos-sdk');

    var config = {
        endpoint: 's3-api.us-geo.objectstorage.softlayer.net',
        apiKeyId: 'QspsYaoDzyhEnrvH9sAR71smhDvztQyP3Lt-A4z8vWIt',
        ibmAuthEndpoint: 'https://iam.ng.bluemix.net/oidc/token',
        serviceInstanceId: 'crn:v1:bluemix:public:cloud-object-storage:global:a/7c06f2981e8c506303bcb7dbed9fd1a6:1669720d-3ce8-4250-a38d-ddb34391bde5::',
    };

    var cos = new AWS.S3(config);


    console.log('Retrieving list of buckets');
    return cos.listBuckets()
        .promise()
        .then((data) => {
            if (data.Buckets != null) {
                for (var i = 0; i < data.Buckets.length; i++) {
                    console.log(`Bucket Name: ${data.Buckets[i].Name}`);
                }
            }
        })
        .catch((e) => {
            console.log(`ERROR: ${e.code} - ${e.message}\n`);
        });


    res.render('pages/login', {
        info: ""

    });

});



app.get('/activate', function (req, res) {
    //var para = req.query.color;
    var activate_code = req.query.code;
    console.log("code=" + activate_code);
    var user;
    if (!mydb) {
        //response.json(names);
        return;
    }

    mydb.list({
        include_docs: true
    }, function (err, body) {
        if (!err) {
            var found = false;
            var token;
            body.rows.forEach(function (row) {
                if (row.doc.type === "user" && row.doc.activate_code === activate_code) {
                    user = row.doc;
                    found = true;

                }
            });
            console.log("found=" + found);

            if (found) {
                user.activated = true;
                //user.pw="123";
                mydb.insert(user, function (err, body, header) {
                    if (err) {
                        console.log('[mydb.insert] ', err.message);
                        res.send("Error");
                    }
                    res.render('pages/activated');
                });
            } else {
                res.render('pages/error');

            }
        } //endif
        else {
            console.log(err);
        }
    });



});

app.get('/mail', function (req, res) {

    var smtpTransport = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true, // use SSL
        auth: {
            user: 'thesocialcircleappnoreply@gmail.com',
            pass: '8yq38cbf'
        }
    });

    // setup e-mail data with unicode symbols
    var mailOptions = {
        from: "thesocialcircleappnoreply@gmail.com", // sender address
        to: "heeheehaha45@gmail.com", // list of receivers
        subject: "Hello ✔", // Subject line
        text: "Hello world ✔", // plaintext body
        html: "<b>Hello world ✔</b>" // html body
    }

    // send mail with defined transport object
    smtpTransport.sendMail(mailOptions, function (error, response) {
        if (error) {
            console.log(error);
        } else {
            console.log("Message sent: " + response.message);
        }

        // if you don't want to use this transport object anymore, uncomment following line
        //smtpTransport.close(); // shut down the connection pool, no more messages
    });

    res.render('pages/login', {
        info: ""

    });

});


function randomString() {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < 30; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;

}



//old and legacy function
app.post('/new_user', urlencodedParser, function (req, res) {
    // Prepare output in JSON format
    response = {
        email: req.body.email,
        password: req.body.password
    };
    console.log(response);

    var email = req.body.email;
    var pw = req.body.password;
    var interest = req.body.interest;
    var faculty = req.body.faculty;
    var name = req.body.name;
    var description = req.body.description;
    //auth
    if (!mydb) {
        //response.json(names);
        return;
    }

    mydb.list({
        include_docs: true
    }, function (err, body) {
        if (!err) {
            var found = false;
            var token;
            body.rows.forEach(function (row) {

                if (row.doc.type === "user" && row.doc.email === email && row.doc.activated === true) {
                    //if (row.doc.type === "user" && row.doc.email === email ) {



                    found = true;


                }

            });


            if (found) {

                res.redirect('/signup?error=userExist');
                // res.redirect('/chatroom?t=' + token);
            } else {
                var user = new Object();
                user.type = "user";
                user.email = sanitize(email);
                user.pw = pw;
                user.token = randomString();
                user.identity = randomString();
                user.picId = randomString();
                user.friend_list = [];
                user.activate_code = randomString();
                user.activated = false;
                user.interest = sanitize(interest);
                user.faculty = sanitize(faculty);
                user.name = sanitize(name);
                user.description = sanitize(description);
                //add to db
                mydb.insert(user, function (err, body, header) {
                    if (err) {
                        console.log('[mydb.insert] ', err.message);
                        res.send("Error");
                    }
                    // user._id = body.id;
                    //res.redirect('/chatroom?t=' + token);
                    //res.send(user);

                    var smtpTransport = nodemailer.createTransport({
                        host: 'smtp.gmail.com',
                        port: 465,
                        secure: true, // use SSL
                        auth: {
                            user: 'thesocialcircleappnoreply@gmail.com',
                            pass: '8yq38cbf'
                        }
                    });
                    var link = domain + "/activate?code=" + user.activate_code;
                    var emailHTML='<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd"><html xmlns="http://www.w3.org/1999/xhtml">    <head>        <meta http-equiv="Content-Type" content`="text/html; charset=UTF-8" />        <title></title>        <style></style>    </head>    <body>        <table border="0" cellpadding="0" cellspacing="0" height="100%" width="100%" id="bodyTable">            <tr>                <td align="center" valign="top">                    <table border="0" cellpadding="20" cellspacing="0" width="600" id="emailContainer">                        <tr>                            <td align="center" valign="top">                                <img src="https://i.imgur.com/HkFS37I.jpg" width= "100px" style= "border: none; display: block; outline: none; width: 100px; opacity: 1; max-width: 100%;">                                <br>Dear, just one more step to activate your account!<br> Please click the following link: <br><a href="' + link + '">link to activate</a></td></tr></table></td></tr></table></body></html>';

                        
                        
                    // setup e-mail data with unicode symbols
                    var mailOptions = {
                        from: "thesocialcircleappnoreply@gmail.com", // sender address
                        to: email, // list of receivers
                        subject: "Activation of your account", // Subject line
                        text: "Dear user, Please click the following link to activate your account: " + link, // plaintext body
                        html: emailHTML // html body
                    }

                    // send mail with defined transport object
                    smtpTransport.sendMail(mailOptions, function (error, response) {
                        if (error) {
                            console.log(error);
                        } else {
                            console.log("Message sent: " + response.message);
                        }

                        // if you don't want to use this transport object anymore, uncomment following line
                        //smtpTransport.close(); // shut down the connection pool, no more messages
                    });

                });


                res.redirect('/login?info=newReg');
                /*
                res.render('pages/upload_profile_pic', {
                    picId: user.picId

                });
                */


            }
        } //endif
        else {
            console.log(err);
        }
    });



});

app.post('/new_user2', urlencodedParser, function (req, res) {

    var email = req.body.email;
    var pw = req.body.password;


    mydb.list({
        include_docs: true
    }, function (err, body) {
        if (!err) {
            var found = false;

            //fetch old friend list
            body.rows.forEach(function (row) {

                if (row.doc.type === "user" && row.doc.email === email) {
                    //user exist already
                    found = true;
                }

            });

            if (found) {
                //user exist already
                res.redirect('/signup?error=userExist');
            } else {
                var user = new Object();
                user.type = "user";
                user.email = email;
                user.pw = pw;
                user.token = randomString();
                user.friend_list = [];



                //add to db
                mydb.insert(user, function (err, body, header) {
                    if (err) {
                        console.log('[mydb.insert] ', err.message);
                        res.send("Error");
                    }
                    // user._id = body.id;
                    //res.redirect('/chatroom?t=' + token);
                    //res.send(user);
                });


                res.redirect('/login');
            }

        } //endif
        else {
            console.log(err);
        }
    });

    res.render('pages/login', {
        info: ""

    });

});

app.post('/auth/', urlencodedParser, function (req, res) {
    // Prepare output in JSON format
    response = {
        email: req.body.email,
        password: req.body.password
    };
    console.log(response);

    var email = req.body.email;
    var pw = req.body.password;

    //auth
    if (!mydb) {
        //response.json(names);
        return;
    }

    mydb.list({
        include_docs: true
    }, function (err, body) {
        if (!err) {
            console.log("body=" + JSON.stringify(body));
            var found = false;
            var token;
            body.rows.forEach(function (row) {

                if (row.doc.type === "user" && row.doc.email === email && row.doc.activated === true) {
                    if (row.doc.pw === pw) {
                        /////////////////////////    
                        //authorized      
                        token = row.doc.token;
                        console.log("token=" + token);
                        found = true;
                        //successfully login
                        //  res.redirect('/chatroom?t='+token);
                        //  res.redirect('/login');
                        /////////////////////////
                    }
                }

            });


            if (found) {
                //successfully login
                console.log("found");
                req.session.token = token;

                //res.redirect('/chatroom?t=' + token);
                res.redirect('/chatroom?t=' + token);
            } else {
                //invalid username or pw
                res.redirect('/login?error=invalid');
            }
        } //endif
        else {
            console.log(err);
        }
    });


    /*
    //get userList
    var userList = {
        "heeheehaha@gmail.com": {
            "pw": "123",
            "token":"123456serfv5dd4s3"

        },
        "userA@gmail.com": {
            "pw": "123",
            "token":"213342342234"

        },
         "userB@gmail.com": {
            "pw": "123",
            "token":"432tf23545"

        },
         "userC@gmail.com": {
            "pw": "123",
            "token":"345rf4543f3"

        }

    };
    
    //check pw
    if(userList[email]===undefined || userList[email].pw!==pw){
        //invalid username or pw
        res.redirect('login?error=invalid');

    }
    else{
       
        var token=userList[email].token;
        //successfully login
        res.redirect('chatroom?t='+token);
    }
        
     */
    // res.redirect('chatroom?t='+);
});



app.post('/test', urlencodedParser, function (req, res) {


    var para = req.body.color;

    console.log("color=" + para);


    // res.render('pages/login');
    res.render('pages/chatroom_test');

});

function getDomain(email) {
    var domain = email.replace(/.*@/, "");
    return domain;
}

app.get('/new_friend_list', urlencodedParser, function (req, res) {

    var token = req.query.t;
    var newFriendList = [];
    var friendList;
    var user;
    var newFriendDoc;
    var userDomain;
    var friendDomain;
    //auth
    if (!mydb) {
        //response.json(names);
        return;
    }




    mydb.list({
        include_docs: true
    }, function (err, body) {
        if (!err) {
            var found = false;

            //fetch old friend list
            body.rows.forEach(function (row) {

                if (row.doc.type === "user" && row.doc.token === token) {
                    friendList = row.doc.friend_list;
                    userDomain = getDomain(row.doc.email);
                }

            });
            //start to search for new friendList


            hkuDomainArr = ["hku.hk", "connect.hku.hk"];
            var check;

            body.rows.forEach(function (row) {

                if (userDomain == hkuDomainArr[0] || userDomain == hkuDomainArr[1]) {
                    //hku
                    check = (row.doc.type === "user" && row.doc.token != token && (getDomain(row.doc.email) == hkuDomainArr[0] || getDomain(row.doc.email) == hkuDomainArr[1]) && row.doc.activated == true);
                } else {
                    //non-hku
                    check = (row.doc.type === "user" && row.doc.token != token && getDomain(row.doc.email) == userDomain && row.doc.activated == true);

                }

                if (check === true) {
                    if (friendList.indexOf(row.doc.email) == -1) {

                        var frd = new Object;

                        frd.name = row.doc.name;
                        //   frd.profilePic = row.doc.profilePic;
                        frd.picURL = "/preview?picId=" + row.doc.picId;
                        frd.description = row.doc.description;
                        frd.faculty = row.doc.faculty;
                        frd.identity = row.doc.identity;

                        newFriendList.push(frd);

                        found = true;
                        //  console.log("friendDomain="+friendDomain);
                        //  console.log("userDomain="+userDomain);
                    }

                } else if (row.doc.type === "user" && row.doc.token === token) {

                    user = row.doc;

                }

            });


            if (found) {
                console.log("----------newFriendList=" + JSON.stringify(newFriendList));

                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify(newFriendList));

            }
        } //endif
        else {
            console.log(err);
        }
    });

});


app.get('/new_friend_select', urlencodedParser, function (req, res) {
    var token = req.query.t;
    var identity = req.query.identity;
    var friendEmail;
    var newFriendDoc;
    var user;
    console.log("identity=" + identity);
    console.log("token=" + token);


    if (!mydb) {
        //response.json(names);
        return;
    }




    mydb.list({
        include_docs: true
    }, function (err, body) {
        if (!err) {
            var found = false;
            var found1 = false;
            var found2 = false;
            //fetch old friend list
            body.rows.forEach(function (row) {


                if (row.doc.type === "user" && row.doc.identity == identity) {
                    /*
                     if (friendList.indexOf(row.doc.email) == -1) {
                         newFriendList.push(row.doc.email);
                         found = true;
                       
                     }
                     */
                    friendEmail = row.doc.email;
                    found1 = true;
                } else if (row.doc.type === "user" && row.doc.token === token) {

                    user = row.doc;
                    found2 = true;

                }

            });

            found = found1 && found2;

            if (found) {
                //successful
                //var len = newFriendList.length;

                //  console.log("----------newFriendList=" + newFriendList);
                //randomly asign a 'new' friend to user; a more mature way should be implemented
                //var newFriend = newFriendList[Math.floor((Math.random() * (len - 1)) + 0)]
                var newFriend = friendEmail;
                //add new friend to user
                user.friend_list.push(newFriend);

                //add to db
                mydb.insert(user, function (err, body, header) {
                    if (err) {
                        console.log('[mydb.insert] ', err.message);
                        res.send("Error");
                        return;
                    }
                    // user._id = body.id;
                    //res.redirect('/chatroom?t=' + token);
                    //res.send(user);
                });

                //add user to "new friend"
                body.rows.forEach(function (row) {

                    if (row.doc.type === "user" && row.doc.email === newFriend) {
                        newFriendDoc = row.doc;
                        newFriendDoc.friend_list.push(user.email);
                    }


                });
                mydb.insert(newFriendDoc, function (err, body, header) {
                    if (err) {
                        console.log('[mydb.insert] ', err.message);
                        res.send("Error");
                        return;
                    }
                    //user._id = body.id;
                    console.log("----new user is added");
                    //res.redirect('/chatroom?t=' + token);
                    //res.send(user);
                });

                //create a new empty chatroom
                var newRoom = new Object();
                var concate = "";

                //
                //if (friend < userId)
                if (newFriendDoc.email < user.email)
                    concate = newFriendDoc.email + user.email;
                else
                    concate = user.email + newFriendDoc.email;

                concate = crypto.createHash('md5').update(concate).digest("hex");

                newRoom.type = "room";
                newRoom.roomId = concate;

                var time = new Date().toUTCString();

                newRoom.history = [{
                    "from": user.email,
                    "to": newFriendDoc.email,
                    "msg": "I have added you. Nice to meet you!",
                    "time": time,
                    "hasRead": false,
                    "id": randomString()


                }];
                mydb.insert(newRoom, function (err, body, header) {
                    if (err) {
                        console.log('[mydb.insert] ', err.message);
                        res.send("Error");
                        return;
                    }
                    //user._id = body.id;
                    console.log("----new room is added");
                    res.redirect('/chatroom?t=' + token);
                    //res.send(user);
                });

                //announce the new friend that he is being added
                //var hashedId = crypto.createHash('md5').update(newFriendDoc.email).digest("hex");
                //var md5 = require("./md5"),
                hashedId = md5(newFriendDoc.email);
                io.sockets.emit('broadcast', {
                    content: hashedId
                });



            } else {
                //no new friend is found
                res.redirect('/chatroom?t=' + token);
            }
        } //endif
        else {
            console.log(err);
        }
    });


});


app.post('/new_friend', urlencodedParser, function (req, res) {


    var token = req.body.token;
    var newFriendList = [];
    var friendList;
    var user;
    var newFriendDoc;
    var userDomain;
    var friendDomain;
    //auth
    if (!mydb) {
        //response.json(names);
        return;
    }




    mydb.list({
        include_docs: true
    }, function (err, body) {
        if (!err) {
            var found = false;

            //fetch old friend list
            body.rows.forEach(function (row) {

                if (row.doc.type === "user" && row.doc.token === token) {
                    friendList = row.doc.friend_list;
                    userDomain = getDomain(row.doc.email);
                }

            });
            //start to search for new friendList




            body.rows.forEach(function (row) {

                if (row.doc.type === "user" && row.doc.token != token && getDomain(row.doc.email) == userDomain) {
                    if (friendList.indexOf(row.doc.email) == -1) {
                        newFriendList.push(row.doc.email);
                        found = true;
                        console.log("friendDomain=" + friendDomain);
                        console.log("userDomain=" + userDomain);
                    }

                } else if (row.doc.type === "user" && row.doc.token === token) {

                    user = row.doc;

                }

            });


            if (found) {
                //successful
                var len = newFriendList.length;

                console.log("----------newFriendList=" + newFriendList);
                //randomly asign a 'new' friend to user; a more mature way should be implemented
                var newFriend = newFriendList[Math.floor((Math.random() * (len - 1)) + 0)]

                //add new friend to user
                user.friend_list.push(newFriend);

                //add to db
                mydb.insert(user, function (err, body, header) {
                    if (err) {
                        console.log('[mydb.insert] ', err.message);
                        res.send("Error");
                        return;
                    }
                    // user._id = body.id;
                    //res.redirect('/chatroom?t=' + token);
                    //res.send(user);
                });

                //add user to "new friend"
                body.rows.forEach(function (row) {

                    if (row.doc.type === "user" && row.doc.email === newFriend) {
                        newFriendDoc = row.doc;
                        newFriendDoc.friend_list.push(user.email);
                    }


                });
                mydb.insert(newFriendDoc, function (err, body, header) {
                    if (err) {
                        console.log('[mydb.insert] ', err.message);
                        res.send("Error");
                        return;
                    }
                    //user._id = body.id;
                    console.log("----new user is added");
                    //res.redirect('/chatroom?t=' + token);
                    //res.send(user);
                });

                //create a new empty chatroom
                var newRoom = new Object();
                var concate = "";

                //
                //if (friend < userId)
                if (newFriendDoc.email < user.email)
                    concate = newFriendDoc.email + user.email;
                else
                    concate = user.email + newFriendDoc.email;

                concate = crypto.createHash('md5').update(concate).digest("hex");

                newRoom.type = "room";
                newRoom.roomId = concate;
                newRoom.history = [{
                    "from": user.email,
                    "to": newFriendDoc.email,
                    "msg": "I have added you. Nice to meet you!"
                }];
                mydb.insert(newRoom, function (err, body, header) {
                    if (err) {
                        console.log('[mydb.insert] ', err.message);
                        res.send("Error");
                        return;
                    }
                    //user._id = body.id;
                    console.log("----new room is added");
                    res.redirect('/chatroom?t=' + token);
                    //res.send(user);
                });

                //announce the new friend that he is being added
                //var hashedId = crypto.createHash('md5').update(newFriendDoc.email).digest("hex");
                //var md5 = require("./md5"),
                hashedId = md5(newFriendDoc.email);
                io.sockets.emit('broadcast', {
                    content: hashedId
                });



            } else {
                //no new friend is found
                res.redirect('/chatroom?t=' + token);
            }
        } //endif
        else {
            console.log(err);
        }
    });



});



//input:friend email array
//return: friend profile array [{nickname,picId}, {nicknameB,picIdB}, ...]
function friendListToProfile(friendEmailArr) {

    var result = [{
        "abc": "def"
    }];

    if (!mydb) {
        //response.json(names);
        console.log("err!");
        return;
    }

    mydb.list({
        include_docs: true
    }, function (err, body) {
        if (!err) {
            console.log("inside");
            // friendEmailArr.forEach(function (friendEmail) {
            for (var i = 0; i < friendEmailArr.length; i++) {
                console.log("inside loop");

                var friendEmail = friendEmailArr[i];
                console.log(friendEmail);

                body.rows.forEach(function (row) {
                    if (row.doc.type === "user" && row.doc.email === friendEmail) {

                        //friend is found

                        var entry = new Object();
                        entry.nickname = row.doc.name;
                        entry.picId = row.doc.picId;
                        result.push(entry);


                    }
                });

            }

            return "hello";

        } //endif
        else {
            console.log(err);
        }




    });

}

app.get('/testFriendListToProfile', function (req, res) {
    var friend_list = [
    "user1@def.com",
    "user5@def.com"
  ];

    console.log("testresult=" + friendListToProfile(friend_list));



});

app.get('/chatroom', function (req, res) {
 /*   if (typeof req.session.token == 'undefined') {
        console.log("session not found");
        res.redirect('/login?info=session_expired');
        return;
    }
*/

    console.log("chatroom");
    //get token
    var token = req.query.t;
    if (typeof token == 'undefined')
        token = req.session.token;
    
    if (typeof token == 'undefined'){
         res.redirect('/login?msg=no_token');
         return;
        
    }

    
    
    console.log("token=" + token);
    //get email from token
    // var userId = "heeheehaha45@abc.com";
    ////////////////
    var userId;
    var _friend_list = [];
    var friend_list = [];
    var room_name_mapping = [];
    var messages = new Object();

    var picId;
    ///////////////

    if (!mydb) {
        //response.json(names);
        return;
    }

    mydb.list({
        include_docs: true
    }, function (err, body) {
        if (!err) {


            body.rows.forEach(function (row) {

                if (row.doc.type === "user" && row.doc.token === token) {

                    /////////////////////////    
                    //token matched      
                    userId = row.doc.email;
                    picId = row.doc.picId;
					nickname = row.doc.name;
					faculty = row.doc.faculty;
					description = row.doc.description;
                    _friend_list = row.doc.friend_list;
                    console.log("row.doc.friend_list=" + row.doc.friend_list);
                    found = true;

                    //get friendlist  
                    //actually friendlist is used as chatroom list
                    //*** should map the frinedlist to coorepsonding chatroom ids
                    //*** when a new friend is added, the db has to updated such that
                    //    both A and B add a new entry for a new friend
                    //    an empty chatroom should be created at the same time
                    //var friend_list = ["userA@abc.com", "userB@abc.com", "userC@abc.com"];
                    console.log(_friend_list);

                    //map the friend_list to roomIds:use hash(asccending(userId,friendId) ) 
                    //=>
                    var concate = "";
                    _friend_list.forEach(function (friend) {
                        console.log("friend=" + friend);
                        if (friend < userId)
                            concate = friend + userId;
                        else
                            concate = userId + friend;

                        concate = crypto.createHash('md5').update(concate).digest("hex");
                        console.log("concate=" + concate);
                        friend_list.push(concate);
                        room_name_mapping.push(friend);
                    });

                    //friend_list = ["roomA", "roomB", "roomC"];





                    /////////////////////////

                }

            });

            //loop through to find messages
            body.rows.forEach(function (row) {

                if (row.doc.type === "room") {

                    /////////////////////////    
                    console.log("room:" + row.doc.roomId);
                    messages[row.doc.roomId] = row.doc.history;

                    /////////////////////////

                }

            });




            //loop through to find profile from friendlist
            var emailToProfileList = new Object();
            //   console.log("_friend_list="+_friend_list);
            body.rows.forEach(function (row) {

                if (row.doc.type === "user") {

                    /////////////////////////    
                    _friend_list.forEach(function (friendEmail) {

                        if (row.doc.email === friendEmail) {

                            //friend is found

                            var entry = new Object();
                            entry.nickname = row.doc.name;
                            entry.picId = "/preview?picId=" + row.doc.picId;
                            entry.faculty = row.doc.faculty;
                            entry.description = row.doc.description;
                            emailToProfileList[friendEmail] = entry;


                        }


                    });
                }

            });


            //////////

            console.log("\n\n\nemailToProfileList=" + JSON.stringify(emailToProfileList));



            console.log("messages=" + JSON.stringify(messages));

            if (found) {
                //successfully found userId
                console.log("found");
                res.render('pages/chatroom', {
                    userId: userId,
                    token: token,
                    //friend_list: friend_list,
                    friend_list: friend_list,

                    room_name_mapping: room_name_mapping,
                    //modfiy here
                    emailToProfileList: JSON.stringify(emailToProfileList),


                    // messages:JSON.stringify(messages).replace('\\"',"'")
                    //    messages:JSON.stringify(messages).replace('\\"',"\\\"")
                    messages: JSON.stringify(messages),
                    picId: picId,
                    picURL: "/preview?picId=" + picId
                });

            } else {
                //invalid or expired token
                res.redirect('/login');
            }



        } //endif
        else {
            console.log(err);
        }
    });







    //get messages history from friend_list
    //need to handle rooms with zero messages.
    /*
        var messages = {
            "roomA": [
                {
                    "from": 'heeheehaha@abc.com',
                    "to": "userA@abc.com",
                    "msg": "hello'"

                            },
                {
                    "from": "userA@abc.com",
                    "to": "heeheehaha@abc.com",
                    "msg": "how are u?"
                            },
                {
                    "from": "heeheehaha@abc.com",
                    "to": "userA@abc.com",
                    "msg": "fine thankyou"
                            }
                         ],
            "roomB": [
                {
                    "from": "heeheehaha@abc.com",
                    "to": "userB@abc.com",
                    "msg": "hello userB"

                            },
                {
                    "from": "userB@abc.com",
                    "to": "heeheehaha@abc.com",
                    "msg": "how are u?"
                            },
                {
                    "from": "heeheehaha@abc.com",
                    "to": "userB@abc.com",
                    "msg": "fine thankyou userB"
                            }

                         ],
            "roomC": [
                {
                    "from": "heeheehaha@abc.com",
                    "to": "userC@abc.com",
                    "msg": "hello userC"

                            },
                {
                    "from": "userC@abc.com",
                    "to": "heeheehaha@abc.com",
                    "msg": "how are u?"
                            },
                {
                    "from": "heeheehaha@abc.com",
                    "to": "userC@abc.com",
                    "msg": "fine thankyou userC"
                            }

                         ]

        };
    */

    /*
        res.render('pages/chatroom', {
            userId: userId,
            friend_list: friend_list,
            // messages:JSON.stringify(messages).replace('\\"',"'")
            //    messages:JSON.stringify(messages).replace('\\"',"\\\"")
            messages: JSON.stringify(messages)
        });
    */
});




app.get('/eps', function (req, res) {
    var drinks = [
        {
            name: 'Bloody Mary',
            drunkness: 3
        },
        {
            name: 'Martini',
            drunkness: 5
        },
        {
            name: 'Scotch',
            drunkness: 10
        }
    ];
    var tagline = "Any code of your own that you haven't looked at for six or more months might as well have been written by someone else.";
    /////
    var names = [];
    var friend_list;
    if (!mydb) {
        response.json(names);
        return;
    }

    mydb.list({
        include_docs: true
    }, function (err, body) {
        if (!err) {
            console.log("body=" + JSON.stringify(body));
            body.rows.forEach(function (row) {
                if (row.doc.name)
                    names.push(row.doc.name);

                if (row.doc.name == "heeheehaha45")
                    friend_list = row.doc.friend_list;


            });
            console.log("names = " + names);



            console.log("friend_list = " + friend_list);

            res.render('pages/index', {
                drinks: drinks,
                tagline: tagline,
                names: names,
                friend_list: friend_list
            });



        }
    });
    //////    




});




app.get('/frontpage', function (req, res) {

    var name = 'hello';
    res.sendfile('frontpage.html', {
        name: name
    });
});



/**
 * Endpoint to get a JSON array of all the visitors in the database
 * REST API example:
 * <code>
 * GET http://localhost:3000/api/visitors
 * </code>
 *
 * Response:
 * [ "Bob", "Jane" ]
 * @return An array of all the visitor names
 */
app.get("/api/visitors", function (request, response) {
    var names = [];
    if (!mydb) {
        response.json(names);
        return;
    }

    mydb.list({
        include_docs: true
    }, function (err, body) {
        if (!err) {
            console.log("body=" + body);
            body.rows.forEach(function (row) {
                if (row.doc.name)
                    names.push(row.doc.name);
            });
            //console.log("names="+names);
            response.json(body);
        }
    });
});



cur_room = "";
users = [];

/*
io.on('connection', function (socket) {
    console.log('A user connected');
    socket.on('setUsername', function (_data) {

        var data = _data.username;

        console.log(data);



        //      socket.join(room_id);

        if (users.indexOf(data) > -1) {
            socket.emit('userExists', data + ' username is taken! Try some other username.');
        } else {
            users.push(data);
            socket.emit('userSet', {
                username: data
            });
        }
    });

    socket.on('msg', function (data) {
        //Send message to everyone
        //  io.sockets.emit('newmsg', data);

        var room_id = data.room_id;

        socket.join(room_id);
        io.to(room_id).emit('newmsg', data);





    })
});

*/

function sanitize(_str) {

    var entityMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '/': '&#x2F;',
        '`': '&#x60;',
        '=': '&#x3D;'
    };
    return String(_str).replace(/[&<>"'`=\/]/g, function (s) {
        return entityMap[s];
    });

}

io.sockets.on('connection', function (socket) {
    socket.on('subscribe', function (room) {
        console.log('joining room', room);
        socket.join(room);
    })

    socket.on('unsubscribe', function (room) {
        console.log('leaving room', room);
        socket.leave(room);
    })


    socket.on('disconnect', function () {
        console.log('user disconnected');
        io.emit('user disconnected');
    });


    socket.on('send', function (data) {
        console.log('sending message');
        data.time = new Date().toUTCString();
        data.hasRead = false;
        io.sockets.in(data.room).emit('newmsg', data);


        //update db
        var newRoom;
        var newMsg = new Object();
        newMsg.from = data.userId;
        newMsg.to = "";
        newMsg.msg = sanitize(data.message);
        newMsg.time = data.time;
        newMsg.hasRead = data.hasRead;
        newMsg.id = randomString();

        console.log(newMsg.time);

        if (!mydb) {
            //response.json(names);
            return;
        }

        mydb.list({
            include_docs: true
        }, function (err, body) {
            if (!err) {
                var found = false;
                var history;
                body.rows.forEach(function (row) {

                    if (row.doc.type === "room" && row.doc.roomId === data.room) {

                        found = true;
                        newRoom = row.doc;
                    }

                });


                if (found) {
                    //successful
                    newRoom.history.push(newMsg);


                    //add to db
                    mydb.insert(newRoom, function (err, body, header) {
                        if (err) {
                            console.log('[mydb.insert] ', err.message);
                            res.send("Error");
                            return;
                        }
                        //user._id = body.id;
                        //res.redirect('/chatroom?t=' + token);
                        //res.send(user);
                    });
                    /////////


                    //res.redirect('/chatroom?t=' + token);
                } else {
                    //invalid username or pw
                    //res.redirect('/login?error=invalid');
                }
            } //endif
            else {
                console.log(err);
            }
        });

        //////////end of db update
    });
});




http.listen(process.env.PORT || 3000, function () {
    console.log('listening on localhost:3000');
});
