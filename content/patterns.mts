/**
 * Sentence patterns per topic (round 3, ARCHITECTURE D51): the 3–4 key
 * structures of each topic with their meaning, shown on the topic page with
 * a voice. Written for SHINING (Starters follows the Cambridge Pre A1 grammar
 * list; GS1 follows the unit themes). Seeded by migration 0030 only into
 * topics whose patterns are still empty; teachers edit them in the app.
 */
export type Pattern = { en: string; vi: string };

export const STARTERS: Record<string, Pattern[]> = {
  animals: [
    { en: "What's this? It's a cat.", vi: "Đây là gì? Đó là con mèo." },
    { en: "I have got a dog.", vi: "Tớ có một con chó." },
    { en: "The frog can jump.", vi: "Con ếch có thể nhảy." },
    { en: "Elephants are big.", vi: "Voi thì to." },
  ],
  colours: [
    { en: "What colour is it? It's red.", vi: "Nó màu gì? Nó màu đỏ." },
    { en: "The bus is yellow.", vi: "Chiếc xe buýt màu vàng." },
    { en: "I like pink flowers.", vi: "Tớ thích hoa màu hồng." },
  ],
  food: [
    { en: "I like bananas.", vi: "Tớ thích chuối." },
    { en: "Can I have an apple, please?", vi: "Cho tớ một quả táo được không ạ?" },
    { en: "Do you like chips? Yes, I do.", vi: "Bạn có thích khoai tây chiên không? Có, tớ thích." },
  ],
  body: [
    { en: "Touch your nose.", vi: "Chạm vào mũi của con." },
    { en: "I have got two eyes.", vi: "Tớ có hai mắt." },
    { en: "I listen with my ears.", vi: "Tớ nghe bằng tai." },
  ],
  clothes: [
    { en: "I'm wearing a hat.", vi: "Tớ đang đội một cái mũ." },
    { en: "Her dress is pink.", vi: "Váy của bạn ấy màu hồng." },
    { en: "Where are my shoes?", vi: "Giày của tớ đâu rồi?" },
  ],
  toys: [
    { en: "I have got a robot.", vi: "Tớ có một con rô-bốt." },
    { en: "He can play the guitar.", vi: "Bạn ấy có thể chơi đàn ghi-ta." },
    { en: "Let's play with the ball.", vi: "Cùng chơi bóng nào." },
  ],
  school: [
    { en: "Open your book, please.", vi: "Các con mở sách ra nhé." },
    { en: "This is my pencil.", vi: "Đây là bút chì của tớ." },
    { en: "Sit down, please.", vi: "Mời các con ngồi xuống." },
  ],
  home: [
    { en: "This is my house.", vi: "Đây là nhà của tớ." },
    { en: "Dad is on the sofa.", vi: "Bố đang ở trên ghế sô-pha." },
    { en: "The ball is under the box.", vi: "Quả bóng ở dưới cái hộp." },
  ],
  numbers: [
    { en: "How many apples are there? There are three.", vi: "Có bao nhiêu quả táo? Có ba quả." },
    { en: "I am seven years old.", vi: "Tớ bảy tuổi." },
    { en: "I have got two cats.", vi: "Tớ có hai con mèo." },
  ],
  family: [
    { en: "This is my brother.", vi: "Đây là anh/em trai của tớ." },
    { en: "Who's she? She's my mother.", vi: "Cô ấy là ai? Đó là mẹ tớ." },
    { en: "I love my family.", vi: "Tớ yêu gia đình tớ." },
  ],
  transport: [
    { en: "We go to school by bus.", vi: "Chúng tớ đi học bằng xe buýt." },
    { en: "I can ride a bike.", vi: "Tớ biết đi xe đạp." },
    { en: "Look at the plane!", vi: "Nhìn chiếc máy bay kìa!" },
  ],
  nature: [
    { en: "The bird is in the tree.", vi: "Con chim ở trên cây." },
    { en: "There are flowers in the garden.", vi: "Có hoa trong vườn." },
    { en: "We are at the beach.", vi: "Chúng tớ đang ở bãi biển." },
  ],
};

export const GS1: Record<string, Pattern[]> = {
  "unit-01": [
    { en: "This is a ball.", vi: "Đây là quả bóng." },
    { en: "I have a bike.", vi: "Tớ có một chiếc xe đạp." },
    { en: "Hello! I am Ben.", vi: "Xin chào! Tớ là Ben." },
  ],
  "unit-02": [
    { en: "This is a cake.", vi: "Đây là cái bánh." },
    { en: "I can see a cat.", vi: "Tớ nhìn thấy một con mèo." },
    { en: "It is a cup.", vi: "Đó là cái cốc." },
  ],
  "unit-03": [
    { en: "I have an apple.", vi: "Tớ có một quả táo." },
    { en: "This is my bag.", vi: "Đây là cái túi của tớ." },
    { en: "It is a hat.", vi: "Đó là cái mũ." },
  ],
  "unit-04": [
    { en: "This is my dog.", vi: "Đây là con chó của tớ." },
    { en: "Open the door, please.", vi: "Làm ơn mở cửa ra." },
    { en: "It is my bed.", vi: "Đó là giường của tớ." },
  ],
  "unit-05": [
    { en: "I like chips.", vi: "Tớ thích khoai tây chiên." },
    { en: "I want some milk.", vi: "Tớ muốn một ít sữa." },
    { en: "I like fish and chips.", vi: "Tớ thích cá và khoai tây chiên." },
  ],
  "unit-06": [
    { en: "This is my pencil.", vi: "Đây là bút chì của tớ." },
    { en: "I have a ruler.", vi: "Tớ có một cái thước." },
    { en: "I can count to ten.", vi: "Tớ đếm được đến mười." },
  ],
  "unit-07": [
    { en: "This is a flower.", vi: "Đây là một bông hoa." },
    { en: "I can see a goat.", vi: "Tớ nhìn thấy một con dê." },
    { en: "She is a girl.", vi: "Bạn ấy là con gái." },
  ],
  "unit-08": [
    { en: "I have a kite.", vi: "Tớ có một con diều." },
    { en: "I can see a horse.", vi: "Tớ nhìn thấy một con ngựa." },
    { en: "He is a boy.", vi: "Bạn ấy là con trai." },
  ],
  "unit-09": [
    { en: "This is a box.", vi: "Đây là cái hộp." },
    { en: "I have an orange.", vi: "Tớ có một quả cam." },
    { en: "It is a sock.", vi: "Đó là một chiếc tất." },
  ],
  "unit-10": [
    { en: "I can see a monkey.", vi: "Tớ nhìn thấy một con khỉ." },
    { en: "It is a lion.", vi: "Đó là con sư tử." },
    { en: "I like mangoes.", vi: "Tớ thích xoài." },
  ],
  "unit-11": [
    { en: "I can see a bus.", vi: "Tớ nhìn thấy một chiếc xe buýt." },
    { en: "I have an umbrella.", vi: "Tớ có một cái ô." },
    { en: "It is sunny.", vi: "Trời nắng." },
  ],
  "unit-12": [
    { en: "I can see a boat.", vi: "Tớ nhìn thấy một chiếc thuyền." },
    { en: "It is a frog.", vi: "Đó là con ếch." },
    { en: "Look at the lake!", vi: "Nhìn cái hồ kìa!" },
  ],
  "unit-13": [
    { en: "I like noodles.", vi: "Tớ thích mì." },
    { en: "I want some rice.", vi: "Tớ muốn một ít cơm." },
    { en: "This is a banana.", vi: "Đây là quả chuối." },
  ],
  "unit-14": [
    { en: "I have a teddy bear.", vi: "Tớ có một con gấu bông." },
    { en: "I like the train.", vi: "Tớ thích đoàn tàu." },
    { en: "This is a robot.", vi: "Đây là con rô-bốt." },
  ],
  "unit-15": [
    { en: "I like football.", vi: "Tớ thích bóng đá." },
    { en: "This is my father.", vi: "Đây là bố của tớ." },
    { en: "I have a flag.", vi: "Tớ có một lá cờ." },
  ],
  "unit-16": [
    { en: "This is my mother.", vi: "Đây là mẹ của tớ." },
    { en: "I want some water.", vi: "Tớ muốn một ít nước." },
    { en: "She is a baby.", vi: "Em ấy là em bé." },
  ],
};

/** Global Success term reviews (D51): which units each review covers. */
export const GS1_REVIEWS = [
  {
    code: "review-1",
    en: "Review 1: Units 1–8",
    vi: "Ôn tập học kỳ 1 (Unit 1–8)",
    emoji: "📚",
    units: ["unit-01", "unit-02", "unit-03", "unit-04", "unit-05", "unit-06", "unit-07", "unit-08"],
  },
  {
    code: "review-2",
    en: "Review 2: Units 9–16",
    vi: "Ôn tập học kỳ 2 (Unit 9–16)",
    emoji: "📚",
    units: ["unit-09", "unit-10", "unit-11", "unit-12", "unit-13", "unit-14", "unit-15", "unit-16"],
  },
];
