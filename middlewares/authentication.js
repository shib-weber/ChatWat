
function checkAuth(req, res, next) {
    if (req.session.user) {
        next(); // User is authenticated, proceed to next middleware
    } else {
        res.redirect('/login');
    }
}

module.exports={checkAuth}