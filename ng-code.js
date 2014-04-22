/**
 * Created by Sagar on 4/5/14.
 */
var trelloApp = angular.module('trello',['firebase','parseAng']);

trelloApp.controller('body',function($scope,$firebase,ParseQueryAngular,ParseSDK,ExtendParseSDK){
    var parse = {};
    parse.collection = {

        userBoards : Parse.Object.extendAngular('userBoards',{  //class named userBoards - to manage one to many relation from user to boards

            setCurrentUser: function(user){
                this.user = user;
            },
            fetchAll: function(){

            }
        })
        ,
        board: Parse.Object.extendAngular('Board')
    }


    $scope.newUser = false;
    $scope.user = null;
    //$scope.people = $firebase(new Firebase("https://fire-suck.firebaseio.com/users"));
    $scope.displayBoards = {};
    $scope.storageBoards = {};
    //$scope.boards = $firebase(new Firebase("https://fire-suck.firebaseio.com/boards"));
    //var fireRef;
    //$scope.selectedBoard = 0;
    $scope.people = {};
    
    var getPeople = function() {
        var qry = new Parse.Query(Parse.User);
        qry.find().then(function(ppl) {
            console.log(ppl);
            for(var i=0;i<ppl.length;i++){
                $scope.people[ppl[i].get('email')] = ppl[i].toJSON();
            }
        }, function(error) {
            $scope.msg = "error getting users:" + JSON.stringify(error);
        });
    }

    var addBoardToView = function(board){
        var obj = board.toJSON();
        obj.by = board.get('by').getEmail();
        $scope.displayBoards[obj.objectId]= obj;
        $scope.storageBoards[obj.objectId]= board;
    }

    var fetchBoards = function(){
        var qry = new Parse.Query(parse.collection.board);
        qry.equalTo('members',parse.user);
        //qry.include('members');
        qry.include('by');
        ParseQueryAngular(qry).then(function(boards){
            boards.forEach(function(board){
                addBoardToView(board);
            })

            //console.log($scope.displayBoards)
        },function(error){
            console.log(error);
        });
    }


    var afterLogIn = function(user){
        parse.user = user;
        $scope.isLoggedIn = true;
        $scope.user = user.toJSON();
        fetchBoards();
        getPeople();
    }

    var afterLogOut = function(){
        $scope.msg = 'Logged out'
        $scope.user = null;
        if(! (typeof $scope.isLoggedIn == 'undefined')){

            $scope.displayBoards = {};
            $scope.userBoards = null;
            $scope.selectedBoard = false;
            $scope.displayBoard = false;
            $scope.shared = {};
        }
        $scope.isLoggedIn = undefined;
    }

    $scope.login = function(){
        ParseQueryAngular(Parse.User,{functionToCall:"logIn", params:[$scope.userName,$scope.pwd]}).then(function(user){
            $scope.msg = 'Logged in.'
            afterLogIn(user);
        },function(error){
            $scope.msg = "error logging in:" + JSON.stringify(error);
            console.log(error);
        });

        $scope.userName = ''
        $scope.pwd = ''
        $scope.msg = 'Wait...'
    };

    $scope.logout = function(){
        Parse.User.logOut();
        afterLogOut();
    };

    $scope.signup = function(){

        $scope.msg = 'Wait...'

        var user = new Parse.User();
        user.set("username", $scope.newUserName);
        user.set("password", $scope.newPwd);
        user.set("email", $scope.newUserName);

        ParseQueryAngular(user,{functionToCall:"signUp", params:[null]}).then(function(user){
            $scope.msg = 'Signup success.';
            afterLogIn(user);
        },function(error){
            $scope.msg = JSON.stringify(error);;
        });

        $scope.newUserName = ''
        $scope.newPwd = ''
        $scope.newUser = false;
    };

    $scope.showSignup = function(bool){
        if(bool){
            $scope.newUser = true;
        }else{
            $scope.newUser = false;
        }
    };



    parse.user = Parse.User.current();

    if(parse.user){
        $scope.msg = 'Logged in.'
        afterLogIn(parse.user);
    } else {
        $scope.msg = 'Not logged in.';
        //afterLogOut();
    }

    $scope.addBoard = function(){
        var board = new parse.collection.board();
        board.set('by',parse.user);
        board.set('name',$scope.newBoardName);
        Parse.Relation(board,'members');
        board.relation('members').add(parse.user); //adding current user as the member

        ParseQueryAngular(board,{functionToCall:'save',params:[null]}).then(function(board){
            $scope.msg = 'board added';
            addBoardToView(board);
        },function(error){
            $scope.msg = "Error in saving board: "+ JSON.stringify(error);
        })

        $scope.newBoardName =''
    }

    $scope.selectedBoard = false;
    $scope.displayBoard = false;
    
    var shareButtonStatus = function() {
        var qry = $scope.selectedBoard.relation('members').query();
        console.log('hello');
        qry.find().then(function(list) {
            for(var i=0;i<list.length;i++) {
                $scope.shared[list[i].get('email')] = list[i].toJSON();
            }
            $scope.$apply();
        }, function(err) {
            $scope.msg = "Error retrieving share status: "+ JSON.stringify(err);
        });
    }
    
    $scope.selectBoard = function(id) {
        $scope.displayBoard = $scope.displayBoards[id];
        $scope.selectedBoard = $scope.storageBoards[id];
        $scope.shared = {};
        var owner = $scope.selectedBoard.get('by');
        ParseQueryAngular(owner, {functionToCall: 'fetch', params: [null]}).then(function(owner) {
            $scope.owner = owner.toJSON();
        }, function(err) {
            $scope.msg = "Error retrieving owner: "+ JSON.stringify(err);
        });
        shareButtonStatus();
        
    }
    
    $scope.showShareBtn = function(email) {
    return true;
        if($scope.selectedBoard && $scope.user && $scope.shared && $scope.shared[$scope.user.email] && $scope.shared[$scope.user.email] !== 'undefined' && $scope.user.email != email && !$scope.shared[email]) {
            return true;
        } else {
            return false;
        }
    }
    
    $scope.showUnshareBtn = function(email) {
    return true;
        if($scope.selectedBoard && $scope.user && $scope.shared && $scope.shared[$scope.user.email] && $scope.shared[$scope.user.email] !== 'undefined' && ($scope.user.email === email || $scope.owner.email === $scope.user.email)){
            return true;
        } else {
            return false;
        }
    }
    
    $scope.shareWith = function(email) {
        var user = new Parse.User();
        user.id = $scope.people[email].objectId;
        var rel = $scope.selectedBoard.relation('members');
        rel.add(user);
        $scope.selectedBoard.save(null, {
            error: function(obj, err) {
                console.log(err);
            }
        });
        $scope.shared[email] = $scope.people[email];
    }
    
    $scope.dontShareWith = function(email) {
        var user = new Parse.User();
        user.id = $scope.people[email].objectId;
        var rel = $scope.selectedBoard.relation('members');
        rel.remove(user);
        $scope.selectedBoard.save();
        delete $scope.shared[email];
    }

/*
    The code from firetrello: need to be converted to parse
    $scope.showShareBtn = function(email){
        return ($scope.user && $scope.shared && $scope.user.email != email && $scope.selectedBoard && $scope.selectedBoard.by == $scope.user.email && email && typeof $scope.shared[email.replace(/\./g,"_")]== 'undefined')
    }

    $scope.showUnshareBtn = function(email){
        return ($scope.user && $scope.shared && $scope.selectedBoard && ($scope.selectedBoard.by == $scope.user.email || $scope.user.email == email ) && email)
    }

    $scope.selectBoard = function(id){
        $scope.selectedBoard = $firebase(new Firebase("https://fire-suck.firebaseio.com/boards/"+id));
        $scope.cards = $firebase(new Firebase("https://fire-suck.firebaseio.com/boards/"+id+"/cards"));
        $scope.shared = $firebase(new Firebase("https://fire-suck.firebaseio.com/boards/"+id+"/shared"));
    }

    $scope.shareWith = function(email){
        $scope.shared.$child(email.replace(/\./g,"_")).$child('email').$set(email);
        $scope.people.$child(email.replace(/\./g,"_")).$child('boards').$child($scope.selectedBoard.$id).$set(true);
    }

    $scope.dontShareWith = function(email){
        $scope.shared.$child(email.replace(/\./g,"_")).$set(null);
        $scope.people.$child(email.replace(/\./g,"_")).$child('boards').$child($scope.selectedBoard.$id).$set(null);
    }

    $scope.addCard = function(){
        $scope.cards.$add({name:$scope.newCardName,by: $scope.user.email});
        $scope.newCardName =''
        $scope.newCardUser = ""
    }
    */
});
