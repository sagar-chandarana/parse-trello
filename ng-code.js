/**
 * Created by Sagar on 4/5/14.
 */
var trelloApp = angular.module('trello',['firebase','parseAng']);

trelloApp.controller('body',function($scope,$firebase,ParseQueryAngular,ParseSDK,ExtendParseSDK){
    var parse = {
                    storage: {
                        cur_user:false, 
                        selectedBoard:false,
                        selectedOrg:false,
                        orgs:{},
                        boards:{},
                        people:{}
                    }
                };

    parse.collection = {
        user: Parse.User,
        board: Parse.Object.extendAngular('Board'),
        card: Parse.Object.extendAngular('Card'),
        organisation: Parse.Object.extendAngular('Organisation'),
        org_mem: Parse.Object.extendAngular('OrgMembers')
    }


    $scope.newUser = false;
    $scope.user = null;
    //$scope.people = $firebase(new Firebase("https://fire-suck.firebaseio.com/users"));

    $scope.displayOrgs = {};
    $scope.displayBoards = {};
    $scope.orgMembers = {};
    
    //$scope.boards = $firebase(new Firebase("https://fire-suck.firebaseio.com/boards"));
    //var fireRef;
    //parse.storage.selected_board = 0;
    $scope.people = {};
    
    var getPeople = function() {
        var qry = new Parse.Query(Parse.User);
        qry.find().then(function(ppl) {
            for(var i=0;i<ppl.length;i++){
                $scope.people[ppl[i].get('email')] = ppl[i].toJSON();
                parse.storage.people[ppl[i].get('email')] = ppl[i];
            }
            $scope.$apply();
        }, function(error) {
            $scope.msg = "error getting users:" + JSON.stringify(error);
        });
    }

    var addBoardToView = function(board){
        var obj = board.toJSON();
        obj.by = board.get('by').getEmail();
        $scope.displayBoards[obj.objectId]= obj;
        parse.storage.boards[obj.objectId]= board;
    }


    var addOrgToView = function(org){
        var obj = org.toJSON();
        obj.by = org.get('by').getEmail();
        $scope.displayOrgs[obj.objectId]= obj;
        parse.storage.orgs[obj.objectId]= org;
    }


    var fetchOrgs = function(){
        var qry = new Parse.Query(parse.collection.org_mem);
        qry.equalTo('member',parse.storage.cur_user);
        //qry.include('members');
        qry.include('org.by');
        ParseQueryAngular(qry).then(function(org_mems){
            org_mems.forEach(function(org_mem){
                console.log(org_mem.toJSON());
                addOrgToView(org_mem.get('org'));
            })

        },function(error){
            console.log(error);
        });
    }

    var fetchBoards = function(){
        parse.storage.boards = {}
        $scope.displayBoards = {}
        $scope.displayBoard = false;
        parse.storage.selected_board = false;

        var qry = new Parse.Query(parse.collection.board);
        qry.equalTo('members',parse.storage.cur_user);
        qry.equalTo('org',parse.storage.selected_org);
        //qry.include('members');
        qry.include('by');
        ParseQueryAngular(qry).then(function(boards){
            console.log("yo boards",boards);
            boards.forEach(function(board){
                addBoardToView(board);
            })

            //console.log($scope.displayBoards)
        },function(error){
            console.log(error);
        });
    }


    var afterLogIn = function(user){
        parse.storage.cur_user = user;
        $scope.isLoggedIn = true;
        $scope.user = user.toJSON();
        fetchOrgs();
    }

    var afterLogOut = function(){
        $scope.msg = 'Logged out'
        $scope.user = null;
        if(! (typeof $scope.isLoggedIn == 'undefined')){

            $scope.displayBoards = {};
            $scope.userBoards = null;
            parse.storage.selected_org = false;
            parse.storage.selected_board = false;
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




    getPeople();
    parse.storage.cur_user = Parse.User.current();

    if(parse.storage.cur_user){
        $scope.msg = 'Logged in.'
        afterLogIn(parse.storage.cur_user);
    } else {
        $scope.msg = 'Not logged in.';
        //afterLogOut();
    }

    $scope.addBoard = function(){
        var board = new parse.collection.board();
        board.set('by',parse.storage.cur_user);
        board.set('org',parse.storage.selected_org);
        board.set('name',$scope.newBoardName);
        Parse.Relation(board,'members');
        board.relation('members').add(parse.storage.cur_user); //adding current user as the member

        ParseQueryAngular(board,{functionToCall:'save',params:[null]}).then(function(board){
            $scope.msg = 'board added';
            addBoardToView(board);
        },function(error){
            $scope.msg = "Error in saving board: "+ JSON.stringify(error);
        })

        $scope.newBoardName =''
    }

    $scope.addOrg = function(){
        var org = new parse.collection.organisation();
        org.set('by',parse.storage.cur_user);
        org.set('name',$scope.newOrgName);
        
        
        
        /*
        Parse.Relation(org,'members');
        org.relation('members').add(parse.storage.cur_user); //adding current user as the member
        */

        ParseQueryAngular(org,{functionToCall:'save',params:[null]}).then(function(org){
            $scope.msg = 'org added';
            addOrgToView(org);

            return $scope.addMember(parse.storage.cur_user.getEmail(),true,org);

        }).then(function(orgMem){
            //nothing;
        },function(error){
            $scope.msg = "Error in saving org: "+ JSON.stringify(error);
        })

        $scope.newOrgName =''
    }

    $scope.displayBoard = false;
    
    var shareButtonStatus = function() {
        var qry = parse.storage.selected_board.relation('members').query();
        qry.find().then(function(list) {
            for(var i=0;i<list.length;i++) {
                $scope.shared[list[i].get('email')] = list[i].toJSON();
            }
            $scope.$apply();
        }, function(err) {
            $scope.msg = "Error retrieving share status: "+ JSON.stringify(err);
        });
    }

    var fetchOrgMembers = function() {
        var qry = new Parse.Query(parse.collection.org_mem);
        qry.equalTo('org',parse.storage.selected_org);
        qry.include('member');

        ParseQueryAngular(qry).then(function(members){
            $scope.orgMembers = {}; //clear old members

            console.log("yo members",members);
            members.forEach(function(memberEntry){
                console.log("yo member",memberEntry.toJSON());
                $scope.orgMembers[memberEntry.get('member').get('email')] = [memberEntry.get('member').toJSON(),memberEntry.get('admin')];
            })

        },function(err) {
            $scope.msg = "Error retrieving org members: "+ JSON.stringify(err);
        });
    }

    $scope.owner = false;
    
    $scope.selectBoard = function(id) {
        $scope.displayBoard = $scope.displayBoards[id];
        parse.storage.selected_board = parse.storage.boards[id];
        $scope.shared = {};
        var owner = parse.storage.selected_board.get('by');
        $scope.owner = owner.toJSON();
        shareButtonStatus();
        
    }

    $scope.selectOrg = function(id) {
        $scope.displayOrg = $scope.displayOrgs[id];
        parse.storage.selected_org = parse.storage.orgs[id];
        $scope.orgMembers = {};
        var owner = parse.storage.selected_org.get('by');
        //$scope.owner = owner.toJSON();
        fetchOrgMembers();
        fetchBoards();
        
    }
    
    $scope.showShareBtn = function(email) {
        if(parse.storage.selected_board && $scope.user && typeof $scope.shared !== 'undefined' && typeof $scope.shared[$scope.user.email] !== 'undefined' && $scope.user.email != email && typeof $scope.shared[email] === 'undefined') {
            return true;
        } else {
            return false;
        }
    }
    
    $scope.showUnshareBtn = function(email) {

        if(parse.storage.selected_board && $scope.user && typeof $scope.shared !== 'undefined' && typeof $scope.shared[$scope.user.email] != 'undefined' && $scope.owner.email != email && ($scope.user.email == email || $scope.owner.email == $scope.user.email)){
            return true;
        } else {
            return false;
        }
    }



    $scope.showAddMemberBtn = function(email){
        return true;
    }

    $scope.showRemoveMemberBtn = function(email){
        return true;
    }

    $scope.removeMember = function(email, asAdmin){
        asAdmin = false || asAdmin ;
        var org = parse.storage.selected_org;
        var orgMem;
        var qry = new Parse.Query(parse.collection.org_mem);
        qry.equalTo('member',parse.storage.people[email])
        qry.equalTo('org',org);

        ParseQueryAngular(qry).then(function(entries){
            if (entries.length>0){
                orgMem = entries[0];
                if (asAdmin){                
                    orgMem.set('admin', false);
                    return ParseQueryAngular(orgMem,{functionToCall:'save',params:[null]});
                } else {
                    return ParseQueryAngular(orgMem,{functionToCall:'destroy',params:[null]});
                }
            } 

        }).then(function(memberEntry){
            fetchOrgMembers();
        },function(err) {
            $scope.msg = "Error adding member: "+ JSON.stringify(err);
        });
    }

    $scope.addMember = function(email, asAdmin,org){

        if (typeof asAdmin == 'undefined'){
            asAdmin = false;
        }
        if (typeof org == 'undefined'){
            org = parse.storage.selected_org;
        }


        var orgMem;

        var qry = new Parse.Query(parse.collection.org_mem);
        qry.equalTo('member',parse.storage.people[email])
        qry.equalTo('org',org);

        ParseQueryAngular(qry).then(function(entries){
            console.log(entries);
            if (entries.length==0){
                orgMem =  new parse.collection.org_mem();
                orgMem.set('org',org);
                orgMem.set('member',parse.storage.people[email]);
                console.log(parse.storage.people[email]);
                console.log(parse.storage.people);
                
            } else {
                orgMem = entries[0];

            }

            orgMem.set('admin',asAdmin);
            return ParseQueryAngular(orgMem,{functionToCall:'save',params:[null]});

        }).then(function(memberEntry){
            if (org == parse.storage.selected_org)
                fetchOrgMembers();
        },function(err) {
            $scope.msg = "Error adding member: "+ JSON.stringify(err);
        });
    }
    
    $scope.shareWith = function(email) {
        var user = new Parse.User();
        user.id = $scope.people[email].objectId;
        var rel = parse.storage.selected_board.relation('members');
        rel.add(user);
        parse.storage.selected_board.save(null, {
            error: function(obj, err) {
                console.log(err);
            }
        });
        $scope.shared[email] = $scope.people[email];
    }
    
    $scope.dontShareWith = function(email) {
        var user = new Parse.User();
        user.id = $scope.people[email].objectId;
        var rel = parse.storage.selected_board.relation('members');
        rel.remove(user);
        parse.storage.selected_board.save();
        delete $scope.shared[email];
        if($scope.user.email === email)
            window.location.reload();
    }

});
