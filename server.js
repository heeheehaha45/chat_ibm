var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var md5 = require("blueimp-md5");

var bodyParser = require('body-parser');

var cfenv = require("cfenv");
var mydb;

const crypto = require('crypto');

// set the view engine to ejs
app.set('view engine', 'ejs');

app.use("/static", express.static(__dirname + '/static'));

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
    res.sendfile('index.html');
});


app.get('/login', function (req, res) {
    res.render('pages/login');

});

app.get('/signup', function (req, res) {
    var error = req.query.error;
    res.render('pages/signup', {
        error: error

    });

});


function randomString() {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < 30; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;

}


app.post('/new_user', urlencodedParser, function (req, res) {
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
            var found = false;
            var token;
            body.rows.forEach(function (row) {

                if (row.doc.type === "user" && row.doc.email === email) {

                      
                    
                        found = true;
              
                    
                }

            });


            if (found) {
               
                 res.redirect('/signup?error=userExist');
               // res.redirect('/chatroom?t=' + token);
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
            }
            else{
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

    res.render('pages/login');

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

                if (row.doc.type === "user" && row.doc.email === email) {
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



app.get('/test', function (req, res) {


    var para = req.query.color;

    console.log("color=" + para);


    // res.render('pages/login');
    res.render('pages/chatroom_test');

});



app.post('/new_friend', urlencodedParser, function (req, res) {




    var token = req.body.token;
    var newFriendList = [];
    var friendList;
    var user;
    var newFriendDoc;
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
                }

            });
            //start to search for new friendList

            body.rows.forEach(function (row) {

                if (row.doc.type === "user" && row.doc.token != token) {
                    if (friendList.indexOf(row.doc.email) == -1) {
                        newFriendList.push(row.doc.email);
                        found = true;
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


app.get('/chatroom', function (req, res) {
    console.log("chatroom");
    //get token
    var token = req.query.t;
    console.log("token=" + token);
    //get email from token
    // var userId = "heeheehaha45@abc.com";
    ////////////////
    var userId;
    var _friend_list = [];
    var friend_list = [];
    var room_name_mapping = [];
    var messages = new Object();
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

            console.log("messages=" + JSON.stringify(messages));

            if (found) {
                //successfully found userId
                console.log("found");
                res.render('pages/chatroom', {
                    userId: userId,
                    token: token,
                    friend_list: friend_list,
                    room_name_mapping: room_name_mapping,
                    // messages:JSON.stringify(messages).replace('\\"',"'")
                    //    messages:JSON.stringify(messages).replace('\\"',"\\\"")
                    messages: JSON.stringify(messages)
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
        io.sockets.in(data.room).emit('newmsg', data);


        //update db
        var newRoom;
        var newMsg = new Object();
        newMsg.from = data.userId;
        newMsg.to = "";
        newMsg.msg = data.message;

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
