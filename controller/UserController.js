// UserController.js

const conn = require('../mariadb'); // db 모듈
const {StatusCodes} = require('http-status-codes'); // status-code 모듈
const jwt = require('jsonwebtoken'); // jwt 모듈 - 로그인 관여
const crypto = require('crypto'); // crypto 모듈 - db의 암호화에 관여
const dotenv = require('dotenv'); // dotenv 모듈
dotenv.config();

const join = (req,res) => {
    const {email, password} = req.body;

    let sql = 'INSERT INTO users (email, password, salt) VALUES (?, ?, ?)';

    // 비밀번호 암호화
    // 회원가입시 비밀번호를 암호화해서 암호화된 비밀번호와, 
    // salt 값을 같이 DB에 저장
    const salt = crypto.randomBytes(10).toString('base64');
    const hashPassword = crypto.pbkdf2Sync(password, salt, 10000, 10,
        'sha512').toString('base64');
    // 해싱한다 : 남들이 못알아보도록 암호화한다.
    // salt는 hashPassword값을 만들 때 사용하는 변수
    // randomBytes(64) : 매개변수로 들어오는 숫자를 랜덤값으로 만들어주는 것.
    // 여기선 64바이트 짜리로 만들어줌.
    // 그 후 toString('base64') : base64방식으로 64바이트 랜덤값을 문자열로 
    // 만들어줌.
    // pbkdf2Sync : 이 메서드는 암호화 알고리즘 종류로 뒤에 값은 암호화 하는데
    // 필요한 매개변수 값을 나타낸다. 해쉬함수를 반복하는 횟수라던지(10000) 등

    // 로그인 시, 이메일&비밀번호(날 것)
    // => db에 저장된salt값 꺼내서 비밀번호를 암호화 해보고
    // => db에 저장된 비밀번호와 비교

    let values = [email, hashPassword, salt];
    conn.query(sql, values,
        (err, results) => {
            if(err) {
                console.log(err);
                return res.status(StatusCodes.BAD_REQUEST).end();
            }

            return res.status(StatusCodes.CREATED).json(results);
        })
};

const login = (req,res) => {
    const {email, password} = req.body;

    let sql = 'SELECT * FROM users WHERE email = ?';
    conn.query(sql, email,
        (err, results) => {
            if(err) {
                console.log(err);
                return res.status(StatusCodes.BAD_REQUEST).end();
            }

            const loginUser = results[0];

            // salt값 꺼내서 날 것으로 들어온 비밀번호를 암호화 해보고 
            const hashPassword = crypto.pbkdf2Sync(password, loginUser.salt
                , 10000, 10, 'sha512').toString('base64');

            // => DB 비밀번호와 비교 
            if(loginUser && loginUser.password == hashPassword) {
                // 토큰 발행
                const token = jwt.sign({
                    email : loginUser.email
                }, process.env.PRIVATE_KEY, {
                    expiresIn : '5m',
                    issuer : "songa"
                });

                // 토큰 쿠키에 담기
                res.cookie("token", token, {
                    httpOnly : true
                });
                console.log(token); // 우리가 토큰이 잘 담긴걸 알기 위해서

                return res.status(StatusCodes.OK).json(results);
            } else {
                return res.status(StatusCodes.UNAUTHORIZED).end();
                // 401 : Unauthorized (비인증 상태), 403 : Forbidden (접근 권리 없음)
            }
        })// OK는 단순한 성공의 의미
};

const passwordResetRequest = (req,res) => {
    const {email} = req.body;

    let sql = 'SELECT * FROM users WHERE email = ?';
    conn.query(sql, email,
        (err, results) => {
            if(err) {
                console.log(err);
                return res.status(StatusCodes.BAD_REQUEST).end();
            }

            // 이메일로 유저가 있는지 찾기
            const user = results[0];
            if (user) {
                return res.status(StatusCodes.OK).json({
                    email : email 
                    // json형태로 body값에서 받았던 email을 다시 돌려주기
                });
            } else {
                return res.status(StatusCodes.UNAUTHORIZED).end();
            }
        }
    )
};

const passwordReset = (req,res) => {
    const {email, password} = req.body; 
    // json형태로 body값에서 받았던 email 다시 돌려받기

    let sql = 'UPDATE users SET password=?, salt=? WHERE email=?';

    // 암호화된 비밀번호와 salt 값을 같이 DB에 저장
    const salt = crypto.randomBytes(10).toString('base64');
    const hashPassword = crypto.pbkdf2Sync(password, salt, 10000, 10,
        'sha512').toString('base64');

    let values = [hashPassword, salt, email];
    conn.query(sql, values,
        (err, results) => {
            if(err) {
                console.log(err);
                return res.status(StatusCodes.BAD_REQUEST).end();
            }

            if(results.affectedRows == 0) // 이메일이 없을 경우
                return res.status(StatusCodes.BAD_REQUEST).end();
            else // 이메일이 있을 경우
                return res.status(StatusCodes.OK).json(results);
        }
    )
};

module.exports = {
    join,
    login,
    passwordResetRequest,
    passwordReset
};