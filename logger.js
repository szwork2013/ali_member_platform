'use strict';

exports.log = function(app, user, ip, type, object, info) {
  var pool = app.mysql_pool;
  // acquire connection - callback function is called
  // once a resource becomes available
  pool.acquire(function(err, c) {
    if (err) {
      // handle error - this is generally the err from your
      // factory.create function
    }
    else {
      c.query("INSERT INTO `log` (`time`, `user`, `ip`, `type`, `object`, `info`) VALUES (NOW(), ?, ?, ?, ?, ?);", [user, ip, type, object, info], function() {
      // return object back to pool
      pool.release(this.client);
    }).on('result', function(res) {
        res.on('row', function(row) {
          console.log('Result row: ' + inspect(row));
        })
          .on('error', function(err) {
            console.log('Result error: ' + inspect(err));
          })
          .on('end', function(info) {
            console.log('Result finished successfully');
          });
      })
      .on('end', function() {
        console.log('Done with all results');
      });
    }
  });
}