exports.getRoot = function(req, res) {
    res.render('index', {user: req.user});
};
