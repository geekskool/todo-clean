class IOCore {
  constructor (ioFunc) {
    this.then = cb => ioFunc((...args) => { cb(...args) });
  };

  reject (pred) {
    let saveThen = this.then;
    this.then = cb => {
      saveThen((...args) => {
        let result = pred(...args);
        if (result !== null) {
          if (Array.isArray(result)) {
            cb(...result);
          } else {
            cb(result);
          }
        };
      });
    };
    return this;
  };

  mayBeFalse (mv, handler) {
    let saveThen = this.then;
    this.then = cb => {
      saveThen((...args) => {
        let result = mv(...args);
        if (result === false) {
          handler(...args);
        } else {
          cb(...args);
        }
      });
    };
    return this;
  };

  mayBeNull (mv, handler) {
    let saveThen = this.then;
    this.then = cb => {
      saveThen((...args) => {
        let result = mv(...args)
        if (result === null) {
          handler(...args);
        } else {
          cb(...args);
        }
      });
    };
    return this;
  };

  mayBeErr (mv, handler) {
    let saveThen = this.then;
    this.then = cb => {
      saveThen((...args) => {
        let result = mv(...args);
        if (result instanceof Error) {
          handler(...args);
        } else {
          cb(...args);
        }
      });
    };
    return this;
  };

  mayBeTrue (mv, handler) {
    let saveThen = this.then;
    this.then = cb => {
      saveThen((...args) => {
        let result = mv(...args);
        if (result === true) {
          handler(...args);
        } else {
          cb(...args);
        }
      });
    };
    return this;
  };

  mayBeUndefined (mv, handler) {
    let saveThen = this.then;
    this.then = cb => {
      saveThen((...args) => {
        let result = mv(...args);
        if (result === undefined) {
          handler(...args);
        } else {
          cb(...args);
        }
      });
    };
    return this;
  };

  map (transform) {
    let saveThen = this.then;
    this.then = cb => {
      saveThen((...args) => {
        let result = transform(...args);
        if (Array.isArray(result)) {
          cb(...result);
        } else {
          cb(result);
        }
      });
    };
    return this;
  };

  bind (ioFunc) {
    let saveThen = this.then;
    this.then = cb => {
      saveThen((...args) => {
        let io = ioFunc(...args);
        io.then((...ioargs) => cb(...args, ...ioargs));
      });
    };
    return this;
  };

  static timer (s) {
    var intervalId;
    var timer = new IOCore(cb => {
      intervalId = setInterval(cb, Math.floor(s * 1000))
    });
    timer.clear = () => clearInterval(intervalId);
    return timer;
  };

  static createIO (ioFunc) {
    return new IOCore(ioFunc);
  };
};

const readline = require('readline');
const fs = require('fs');

const rlConfig = {
  input: process.stdin,
  output: process.stdout
}; /* Config for readline interface */

class IO extends IOCore {
  static getLine (str) {
    const rl = readline.createInterface(rlConfig);
    return new IOCore(cb => rl.question(str, cb))
      .map(data => {
        rl.close();
        return data;
      });
  };

  static putLine (...data) {
    return new IOCore(cb => process.nextTick(cb, data))
      .map(data => {
        console.log(...data);
        return data
      });
  };

  static readFile (filename) {
    return new IOCore(cb => fs.readFile(filename, cb))
      .map((_, data) => data.toString());
  };

  static writeFile (filename, data) {
    return new IOCore(cb => fs.writeFile(filename, data, cb));
  };
};

const express = require('express');
const path = require('path');
const sessions = require('client-sessions');
const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.use(sessions({
    cookieName: 'session',
    secret: 'mysecret',
    duration: 7 * 24 * 60 * 60 * 1000,
    activeDuration: 24 * 60 * 60 * 1000
}));
IO.createIO(cb => app.get('/', cb)).mayBeUndefined((req, res) => req.session.user, (req, res) => res.redirect('/login')).then((req, res) => {
    res.send('hello world');
});
IO.createIO(cb => app.get('/login', cb)).then((req, res) => {
    res.send('login page');
});
IO.createIO(cb => app.get('/logout', cb)).map((req, res, _) => {
    (delete req.session.user)
    return [
        req,
        res,
        _
    ];
}).then((req, res, _) => {
    res.redirect('/');
});
app.listen(3000);
