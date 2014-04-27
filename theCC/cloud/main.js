
// Use Parse.Cloud.define to define as many cloud functions as you want.
// For example:
Parse.Cloud.define("hello", function(request, response) {
  response.success("Hello world!");
});

Parse.Cloud.define("removeMember",function(request,response){
	Parse.Cloud.useMasterKey();
	var qryRole = new Parse.Query(Parse.Role);
	qryRole.equalTo('name','Members-'+request.params.org_id);

	var qryUser = new Parse.Query(Parse.User);

	Parse.Promise.when([qryRole.find(),qryUser.get(request.params.user_id)])
    .then(function(roles,user){
    	
        var role = roles[0];
        role.getUsers().remove(user)
        return role.save();
    }).then(function(suc){
    	response.success(suc);
    },function(err){
    	response.error('Error removing the member in cloud'+JSON.stringify(err));
    });
});