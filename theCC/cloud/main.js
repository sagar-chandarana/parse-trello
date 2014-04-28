
// Use Parse.Cloud.define to define as many cloud functions as you want.
// For example:

var parse = {};

parse.collection = {
        user: Parse.User,
        board: Parse.Object.extend('Board'),
        card: Parse.Object.extend('Card'),
        organisation: Parse.Object.extend('Organisation'),
        org_mem: Parse.Object.extend('OrgMembers')
};

Parse.Cloud.define("hello", function(request, response) {
  response.success("Hello world!");
});

Parse.Cloud.define("removeMember",function(request,response){
	Parse.Cloud.useMasterKey();
    var user;

	var qryRole = new Parse.Query(Parse.Role);
	qryRole.equalTo('name','Members-'+request.params.org_id);

	var qryUser = new Parse.Query(Parse.User);

	Parse.Promise.when([qryRole.find(),qryUser.get(request.params.user_id)])
    .then(function(roles,usr){
    	user = usr;
        var role = roles[0];
        role.getUsers().remove(user);
        return role.save();
    }).then(function(suc){
        var qryOrg = new Parse.Query(parse.collection.organisation);
        return qryOrg.get(request.params.org_id);
    }).then(function(org){
        console.log('Org');
        console.log(org);
        var qryBoards = new Parse.Query(parse.collection.board);
        qryBoards.equalTo('org',org);
        qryBoards.equalTo('members',user);
        return qryBoards.find();
    }).then(function(boards){
        console.log('Boards');
        console.log(boards);
        var proArray = [];
        for(var i=0;i<boards.length;i++){
            boards[i].relation('members').remove(user);
            proArray.push(boards[i].save());
        }
        console.log(proArray);
        return Parse.Promise.when(proArray);
    }).then(function(suc){
        console.log('Suc');
        console.log(suc);
    	response.success(suc);
    },function(err){
    	response.error('Error removing the member in cloud'+JSON.stringify(err));
    });
});