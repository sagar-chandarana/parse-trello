/**
 * Created by Sagar on 4/15/14.
 */
parseAng = angular.module('parseAng',[]);

parseAng.factory('ParseQueryAngular',['$q','$timeout',function ($q, $timeout) {


    // we use $timeout 0 as a trick to bring resolved promises into the Angular digest
    var angularWrapper = $timeout;

    return function(query,options) {

        // if unspecified, the default function to call is 'find'
        var functionToCall = "find";
        if (!_.isUndefined(options) && !_.isUndefined(options.functionToCall)) {
            functionToCall = options.functionToCall;
        }

        // create a promise to return
        var defer = $q.defer();

        // this is the boilerplate stuff that you would normally have to write for every Parse call
        var defaultParams = [{
            success:function(data) {

                /* We're using $timeout as an "angular wrapper" that will force a digest
                 * and kind of bring back the data in Angular realm.
                 * You could use the classic $scope.$apply as well but here we don't need
                 * to pass any $scope as a parameter.
                 * Another trick is to inject $rootScope and use $apply on it, but well, $timeout is sexy.
                 */
                angularWrapper(function(){
                    defer.resolve(data);
                });
            },
            error:function(data,err) {
                angularWrapper(function(){
                    defer.reject(err);
                });
            }
        }];
        // Pass custom params if needed.
        if (options && options.params) {
            defaultParams = options.params.concat(defaultParams);
        }
        if (options && options.mergeParams) {
            defaultParams[0] = _.extend(defaultParams[0],options.mergeParams);
        }

        // this is where the async call is made outside the Angular digest
        query[functionToCall].apply(query,defaultParams);

        return defer.promise;

    };

}]);

parseAng.factory('ParseSDK', function() {

        // pro-tip: swap these keys out for PROD keys automatically on deploy using grunt-replace
        Parse.initialize("C6B4x00ER4T3WK2bLoXUu5vZ3LO1GdtAM5n6T9v6", "lhcyDR93Vzolg7fgl3ZVxBgDSW6xt5Kye1Bi36u4");

    });

parseAng.factory('ParseAbstractService', ['ParseQueryAngular', function(ParseQueryAngular) {



    var object = function(originalClass) {
        originalClass.prototype = _.extend(originalClass.prototype,{
            load:function() {
                return ParseQueryAngular(this,{functionToCall:"fetch"});
            },
            saveParse:function(data) {
                if (data && typeof data == "object") this.set(data);
                return ParseQueryAngular(this,{functionToCall:"save", params:[null]});
            }
        });
        return originalClass;
    };

    var collection = function(originalClass){
        originalClass.prototype = _.extend(originalClass.prototype,{
            load:function() {
                return ParseQueryAngular(this,{functionToCall:"fetch"});
            }
        });
        return originalClass;
    };


    return {
        EnhanceObject:object,
        EnhanceCollection:collection
    };

}]);


parseAng.factory('ExtendParseSDK', ['ParseAbstractService', function(ParseAbstractService) {

    Parse.Object.extendAngular = function(options) {
        return ParseAbstractService.EnhanceObject(Parse.Object.extend(options));
    };

    Parse.Collection.extendAngular = function(options) {
        return ParseAbstractService.EnhanceCollection(Parse.Collection.extend(options));
    };

}]);

