var myUtil = require('../myUtil.js');
var $ = require('jQuery');
exports.index = function(req, res){
var url="http://movie.douban.com/subject/11529526";
console.log(url);
myUtil.get(url,function(content,status){
console.log("status:="+status);
res.send(content);
});
};