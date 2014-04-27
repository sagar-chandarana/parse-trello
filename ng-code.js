/**
 * Created by Sagar on 4/5/14.
 */

var trelloApp = angular.module('trello',['parseAng']);

trelloApp.controller('body',function($scope,$q,ParseQueryAngular,ParseSDK,ExtendParseSDK){

    //init vars
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
    $scope.displayBoard = false;
    $scope.people = {};
    


    //init functions
    var main = function(){
        getPeople();
        parse.storage.cur_user = Parse.User.current();

        if(parse.storage.cur_user){
            $scope.msg = 'Logged in.'
            afterLogIn(parse.storage.cur_user);
        } else {
            $scope.msg = 'Not logged in.';
            //afterLogOut();
        }
    }

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
        reset('all_orgs');

        var qry = new Parse.Query(parse.collection.org_mem);
        qry.equalTo('member',parse.storage.cur_user);
        //qry.include('members');
        qry.include('org.by');
        ParseQueryAngular(qry).then(function(org_mems){
            org_mems.forEach(function(org_mem){
                //console.log(org_mem.toJSON());
                addOrgToView(org_mem.get('org'));
            })

        },function(error){
            //console.log(error);
        });
    }

    var fetchBoards = function(){
        reset('all_boards')

        var qry = new Parse.Query(parse.collection.board);
        qry.equalTo('members',parse.storage.cur_user);
        qry.equalTo('org',parse.storage.selected_org);
        //qry.include('members');
        qry.include('by');
        ParseQueryAngular(qry).then(function(boards){
            //console.log("yo boards",boards);
            boards.forEach(function(board){
                addBoardToView(board);
            })

            ////console.log($scope.displayBoards)
        },function(error){
            //console.log(error);
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

        if(! (typeof $scope.isLoggedIn == 'undefined')){
            reset('all');
        }

    }

    var reset = function(what){
        switch(what){
            case 'all':

            case 'cur_user':
                $scope.user = null;
                $scope.isLoggedIn = undefined;
                parse.storage.cur_user = false;

            case 'all_orgs':
                parse.storage.orgs = {};
                $scope.displayOrgs = {};

            case 'org':
                parse.storage.selected_org = false;
                $scope.displayOrg = false;

            case 'org_mems':
                $scope.orgMembers = {};

            case 'all_boards':
                $scope.displayBoards = {};
                parse.storage.boards = {};
            
            case 'board':
                parse.storage.selected_board = false;
                $scope.displayBoard = false;

            case 'board_mems':
                $scope.shared = {};
                break;

            default:
                $scope.msg = 'reset what?'
                break;
        }

    }

    $scope.login = function(){
        ParseQueryAngular(Parse.User,{functionToCall:"logIn", params:[$scope.userName,$scope.pwd]}).then(function(user){
            $scope.msg = 'Logged in.'
            afterLogIn(user);
        },function(error){
            $scope.msg = "error logging in:" + JSON.stringify(error);
            //console.log(error);
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
        var orgNew = new parse.collection.organisation();
        orgNew.set('by',parse.storage.cur_user);
        orgNew.set('name',$scope.newOrgName);

        var memberRole;
        var adminRole;
        
        /*
        Parse.Relation(org,'members');
        org.relation('members').add(parse.storage.cur_user); //adding current user as the member
        */

        ParseQueryAngular(orgNew,{functionToCall:'save',params:[null]})
        .then(function(org){
            orgNew = org;
            $scope.msg ='org saved. wait..'

            var adminRoleACL = new Parse.ACL();
            adminRole = new Parse.Role("Admins-"+orgNew.id, adminRoleACL);
            adminRole.getUsers().add(parse.storage.cur_user);
            adminRoleACL.setRoleWriteAccess(adminRole,true);
            adminRoleACL.setRoleReadAccess(adminRole,true);

            return ParseQueryAngular(adminRole,{functionToCall:'save',params:[null]})

        },function(error){
            $scope.msg = "Error in saving org: "+ JSON.stringify(error);
        })

        .then(function(adminRole) {
            $scope.msg = 'Rolling. wait..';
            var memberRoleACL = new Parse.ACL();
            memberRole = new Parse.Role("Members-"+orgNew.id, memberRoleACL);
            memberRole.getUsers().add(parse.storage.cur_user);
            memberRoleACL.setRoleReadAccess(memberRole,true);
            memberRoleACL.setRoleWriteAccess(adminRole,true);
            memberRoleACL.setRoleReadAccess(adminRole,true);

            return ParseQueryAngular(memberRole,{functionToCall:'save',params:[null]});

        },function(error){
            $scope.msg = 'Not rolling: '+JSON.stringify(error);
        })

        .then(function(role){
            $scope.msg = 'Adding permissions..';

            var orgACL = new Parse.ACL();
            orgACL.setRoleReadAccess(memberRole,true);
            orgACL.setRoleReadAccess(adminRole,true);
            orgACL.setRoleWriteAccess(adminRole,true);

            orgNew.setACL(orgACL);
            return ParseQueryAngular(orgNew,{functionToCall:'save',params:[null]});

        })
        .then(function(orgNew){


            $scope.msg = 'permissions added.';
            addOrgToView(orgNew);

            $scope.addMember(parse.storage.cur_user.getEmail(),true,orgNew);

        },function(error){
            $scope.msg = 'zyada nahi chad rhi: '+JSON.stringify(error);
        })

        $scope.newOrgName =''
    }

    
    var fetchBoardMembers = function() {
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
        reset('org_mems')
        var qry = new Parse.Query(parse.collection.org_mem);
        qry.equalTo('org',parse.storage.selected_org);
        qry.include('member');

        ParseQueryAngular(qry).then(function(members){
            reset('org_mems'); //clear old members

            //console.log("yo members",members);
            members.forEach(function(memberEntry){
                //console.log("yo member",memberEntry.toJSON());
                $scope.orgMembers[memberEntry.get('member').get('email')] = [memberEntry.get('member').toJSON(),memberEntry.get('admin')];
            })

        },function(err) {
            $scope.msg = "Error retrieving org members: "+ JSON.stringify(err);
        });
    }

    
    $scope.selectBoard = function(id) {
        reset('board');
        $scope.displayBoard = $scope.displayBoards[id];
        parse.storage.selected_board = parse.storage.boards[id];
        fetchBoardMembers();
        
    }

    $scope.selectOrg = function(id) {
        reset('org');
        $scope.displayOrg = $scope.displayOrgs[id];
        parse.storage.selected_org = parse.storage.orgs[id];
        fetchOrgMembers();
        fetchBoards();
        
    }
    
    $scope.showShareBtn = function(email) {
        if(parse.storage.selected_board && $scope.user && typeof $scope.shared !== 'undefined' && typeof $scope.shared[$scope.user.email] !== 'undefined' && typeof $scope.shared[email] === 'undefined') {
            return true;
        } else {
            return false;
        }
    }
    
    $scope.showUnshareBtn = function(email) {

        if(parse.storage.selected_board && $scope.user && typeof $scope.shared !== 'undefined' && typeof $scope.shared[$scope.user.email] != 'undefined' && $scope.displayBoard.by != email && ($scope.user.email == email || $scope.displayBoard.by == $scope.user.email)){
            return true;
        } else {
            return false;
        }
    }

    $scope.showAddMemberBtn = function(email,adminBtn){
        return true;
        //console.log((typeof adminBtn == 'undefined'? typeof $scope.orgMembers[email] == 'undefined' : typeof $scope.orgMembers[email] != 'undefined'))
        return parse.storage.selected_org && $scope.user && typeof $scope.orgMembers !== 'undefined' && (typeof adminBtn == 'undefined'? typeof $scope.orgMembers[email] == 'undefined' : typeof $scope.orgMembers[email] != 'undefined') && typeof $scope.orgMembers[$scope.user.email] != 'undefined' && $scope.orgMembers[$scope.user.email][1];
    }

    $scope.showRemoveMemberBtn = function(email){
        return parse.storage.selected_org && $scope.user && typeof $scope.orgMembers !== 'undefined' && typeof $scope.orgMembers[$scope.user.email] != 'undefined' && ($scope.user.email == email || $scope.orgMembers[$scope.user.email][1]);
    }

    $scope.removeMember = function(email, asAdmin){

        if (typeof asAdmin == 'undefined'){
            var asAdmin = false;
        }
        var org = parse.storage.selected_org;
        var orgMem;
        var promise;
        

        if(asAdmin){
            var qryRole = new Parse.Query(Parse.Role);
            qryRole.equalTo('name',"Admins-"+org.id);
            promise = ParseQueryAngular(qryRole).then(function(roles){
                var role = roles[0];
                role.getUsers().remove(parse.storage.people[email])
                return ParseQueryAngular(role,{functionToCall:'save',params:[null]});
            });
        } else {
            var params = ['removeMember',{org_id:org.id,user_id:parse.storage.people[email].id}]
            promise = ParseQueryAngular(Parse.Cloud,{functionToCall:'run',params:params});
        }

        promise
            .then(function(suc){
                var qry = new Parse.Query(parse.collection.org_mem);
                qry.equalTo('member',parse.storage.people[email])
                qry.equalTo('org',org);

                return ParseQueryAngular(qry);
            })
            .then(function(entries){
                if (entries.length>0){
                    orgMem = entries[0];
                    if (asAdmin){
                        orgMem.set('admin', false);
                        return ParseQueryAngular(orgMem,{functionToCall:'save',params:[null]});
                    } else {
                        return ParseQueryAngular(orgMem,{functionToCall:'destroy',params:[null]});
                    }
                }
            }).then(function(){
                console.log(email,$scope.user.email,asAdmin);
                if(email == $scope.user.email && !asAdmin){
                    fetchOrgs();
                } else {
                    fetchOrgMembers();
                }
            },function(err) {
                $scope.msg = "Error adding member: "+ JSON.stringify(err);
            });
    }

    $scope.addMember = function(email, asAdmin,org){

        if (typeof asAdmin == 'undefined'){
            var asAdmin = false;
        }
        if (typeof org == 'undefined'){
            var org = parse.storage.selected_org;
        }

        var memberRole;
        var adminRole;

        var qryRole = new Parse.Query(Parse.Role);
        qryRole.equalTo('name','Members-'+org.id);

        ParseQueryAngular(qryRole)
        .then(function(roles){
            memberRole = roles[0];

            memberRole.getUsers().add(parse.storage.people[email])
            return ParseQueryAngular(memberRole,{functionToCall:'save',params:[null]});
        })
        .then(function(memberRole){
            var qryARole = new Parse.Query(Parse.Role);
            qryARole.equalTo('name',"Admins-"+org.id);
            return ParseQueryAngular(qryARole);

        })
        .then(function(roles){
            adminRole = roles[0];
            if(asAdmin){
                adminRole.getUsers().add(parse.storage.people[email])
                return ParseQueryAngular(adminRole ,{functionToCall:'save',params:[null]});
            }else{
                var empty = $q.defer();
                setTimeout(function(){
                    empty.resolve(false);
                },0);
                return empty;
            }
        })
        .then(function(){
            var qry = new Parse.Query(parse.collection.org_mem);
            qry.equalTo('member',parse.storage.people[email])
            qry.equalTo('org',org);

            return ParseQueryAngular(qry);
        })
        .then(function(entries){

            if (entries.length==0){
                var orgMem =  new parse.collection.org_mem();
                orgMem.set('org',org);
                orgMem.set('member',parse.storage.people[email]);
                var orgMemAcl = new Parse.ACL(parse.storage.people[email]);
                orgMemAcl.setRoleReadAccess(memberRole,true);
                orgMemAcl.setRoleReadAccess(adminRole,true);
                orgMemAcl.setRoleWriteAccess(adminRole,true);
                orgMem.setACL(orgMemAcl);

            } else {
                var orgMem = entries[0];
            }

            orgMem.set('admin',asAdmin);
            return ParseQueryAngular(orgMem,{functionToCall:'save',params:[null]});

        })
        .then(function(memberEntry){
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
                //console.log(err);
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

    main();

});
