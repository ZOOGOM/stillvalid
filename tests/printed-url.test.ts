import test from "node:test";
import assert from "node:assert/strict";
import { printedUrl } from "../src/lib/printed-url";

test("finds a printed address with or without a scheme", () => {
  assert.equal(
    printedUrl("자세한 내용은 https://www.miryang.go.kr/web/notice 참고."),
    "https://www.miryang.go.kr/web/notice",
  );
  assert.equal(
    printedUrl("공지: www.seoul.go.kr/news/news_notice.do?bbsNo=277"),
    "https://www.seoul.go.kr/news/news_notice.do?bbsNo=277",
  );
  assert.equal(
    printedUrl("See gov.uk/apply-passport."),
    "https://gov.uk/apply-passport",
  );
  // http is upgraded because only https sources are fetched.
  assert.equal(printedUrl("http://nps.gov/yose"), "https://nps.gov/yose");
});

test("offers only a public body's site, never another printed link", () => {
  assert.equal(printedUrl("예매: https://www.ticketsite.com/fest"), null);
  assert.equal(
    printedUrl(
      "예매 www.ticketsite.com / 주최 https://culture.gwangju.go.kr/board?id=3",
    ),
    "https://culture.gwangju.go.kr/board?id=3",
  );
});

test("ignores social, blog and shortener links, e-mail and file names", () => {
  assert.equal(
    printedUrl(
      "인스타 https://instagram.com/fest 블로그 blog.naver.com/x bit.ly/abc",
    ),
    null,
  );
  assert.equal(printedUrl("문의 help@library.go.kr"), null);
  assert.equal(printedUrl("신청서(form.pdf)를 제출"), null);
  assert.equal(printedUrl("버전 1.2.3, 192.168.0.1"), null);
  assert.equal(printedUrl("주소 없음"), null);
  // A bare home page is left to the search.
  assert.equal(printedUrl("문의: 홈페이지(www.seoul.go.kr)"), null);
});
