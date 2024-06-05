// BookController.js

const conn = require('../mariadb'); // db 모듈
const {StatusCodes} = require('http-status-codes'); // status-code 모듈

// (카테고리 별, 신간 여부) 전체 도서 목록 조회
const allBooks = (req,res) => {
    let {category_id, news, limit, currentPage} = req.query;

    // limit : page당 도서 수       ex. 3
    // currentPage : 현재 몇 페이지 ex. 1, 2, 3, ...
    // offset :                    ex. 0, 3, 6, 9, 12, ...
    // offset = limit * (currentPage-1)
    let offset = limit * (currentPage-1);

    let sql = "SELECT * FROM books";
    let values = []; // 문자형으로 보내면 에러가 나기 때문에 ParseInt로 변환해주고 가자.
                                            // offset은 위에서 계산식을 작성하다보니 자연스럽게 숫자로 넘어갔다.
    if(category_id && news) {
        sql += " WHERE category_id=? AND pub_date BETWEEN DATE_SUB(NOW(), INTERVAL 1 MONTH) AND NOW()"; 
        // 맨처음에 띄워쓰기 중요! 앞 SQL의 뒷부분에 바로 이어지기 때문에 띄워쓰기가 안되있으면 버그남.
        values = [category_id]; // 배열 추가
    } else if(category_id) {
        sql += " WHERE category_id=?";
        values = [category_id];
    } else if (news) {
        sql += " WHERE pub_date BETWEEN DATE_SUB(NOW(), INTERVAL 1 MONTH) AND NOW()";
    }

    sql += " LIMIT ? OFFSET ? ";
    values.push(parseInt(limit), offset);

    conn.query(sql, values,
        (err, results) => {
            if (err) {
                console.log(err);
                return res.status(StatusCodes.BAD_REQUEST).end();
            }

            if (results.length)
                return res.status(StatusCodes.OK).json(results);
            else
                return res.status(StatusCodes.NOT_FOUND).end();
    })
};

const bookDetail = (req, res) => {
    let {id} = req.params;

    let sql = `SELECT * FROM Bookshop.books LEFT JOIN category ON 
                books.category_id = category.id WHERE books.id = ?;`;
    conn.query(sql, id,
        (err, results) => {
            if (err) {
                console.log(err);
                return res.status(StatusCodes.BAD_REQUEST).end();
            }

            if(results[0])
                return res.status(StatusCodes.OK).json(results[0]);
            else
                return res.status(StatusCodes.NOT_FOUND).end();
        })
};

module.exports = {
    allBooks,
    bookDetail
};