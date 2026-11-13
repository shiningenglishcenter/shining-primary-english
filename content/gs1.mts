/**
 * Global Success 1 practice pack, organised by the textbook's units.
 * Unit titles and core words follow the "Tiếng Anh 1 Global Success" syllabus
 * (NXB Giáo dục Việt Nam) as remembered by the author: TEACHERS SHOULD CHECK
 * them against the book and fix anything in the app's editor. Sentences,
 * passages and questions are written for SHINING; nothing is copied from the
 * book's texts, pictures or audio (the repository is public).
 *
 * Each word appears in one unit only: vocabulary is unique per level.
 * Same format as content/starters.mts, plus an optional short reading.
 */
import type { Topic } from "./starters.mts";

export const LEVEL_CODE = "GS1";

export const TOPICS: Topic[] = [
  {
    code: "unit-01",
    en: "Unit 1: In the school playground",
    vi: "Ở sân trường",
    emoji: "⚽",
    words: [
      ["ball", "quả bóng", "⚽"],
      ["bike", "xe đạp", "🚲"],
      ["book", "quyển sách", "📖"],
      ["bell", "cái chuông", "🔔"],
      ["balloon", "bóng bay", "🎈"],
    ],
    trueFalse: [
      ["⚽", "This is a ball.", true],
      ["🚲", "This is a book.", false],
      ["🔔", "It's a bell.", true],
      ["🎈", "It's a bike.", false],
    ],
    fillBlank: [
      ["📖", "This is a ___.", "book", "ball", "bell"],
      ["🚲", "I can see a ___.", "bike", "book", "balloon"],
      ["🎈", "It's a red ___.", "balloon", "bike", "bell"],
    ],
    rearrange: [
      ["⚽", "This is a ball."],
      ["🚲", "I have a bike."],
      ["📖", "It is a book."],
    ],
    reading: {
      title: "At school",
      emoji: "🏫",
      passage: "Hello! I am Ben. This is my school. I have a ball. I have a bike too.",
      items: [
        { type: "tf", sentence: "Ben has a ball.", answer: true },
        { type: "tf", sentence: "Ben has a balloon.", answer: false },
        { type: "mc", question: "What is his name?", answer: "Ben", options: ["Ben", "Bill", "Bob"] },
      ],
    },
  },
  {
    code: "unit-02",
    en: "Unit 2: In the dining room",
    vi: "Trong phòng ăn",
    emoji: "🎂",
    words: [
      ["cake", "bánh ngọt", "🎂"],
      ["car", "xe ô tô", "🚗"],
      ["cat", "con mèo", "🐈"],
      ["cup", "cái cốc", "☕"],
      ["cookie", "bánh quy", "🍪"],
    ],
    trueFalse: [
      ["🎂", "This is a cake.", true],
      ["🐈", "This is a car.", false],
      ["☕", "It's a cup.", true],
      ["🍪", "It's a cat.", false],
    ],
    fillBlank: [
      ["🐈", "This is a ___.", "cat", "car", "cake"],
      ["🚗", "I can see a ___.", "car", "cup", "cat"],
      ["🍪", "I like the ___.", "cookie", "car", "cup"],
    ],
    rearrange: [
      ["🎂", "This is a cake."],
      ["🐈", "I can see a cat."],
      ["☕", "It is a cup."],
    ],
    reading: {
      title: "My cat",
      emoji: "🐈",
      passage: "This is my cat. Her name is Kitty. Kitty is in the dining room. She can see a cake.",
      items: [
        { type: "tf", sentence: "The cat's name is Kitty.", answer: true },
        { type: "tf", sentence: "Kitty can see a car.", answer: false },
        {
          type: "mc",
          question: "Where is Kitty?",
          answer: "in the dining room",
          options: ["in the dining room", "in the car", "in the cup"],
        },
      ],
    },
  },
  {
    code: "unit-03",
    en: "Unit 3: At the street market",
    vi: "Ở chợ",
    emoji: "🍎",
    words: [
      ["apple", "quả táo", "🍎"],
      ["bag", "cái túi", "👜"],
      ["hand", "bàn tay", "✋"],
      ["hat", "cái mũ", "🎩"],
      ["ant", "con kiến", "🐜"],
    ],
    trueFalse: [
      ["🍎", "This is an apple.", true],
      ["👜", "This is a hat.", false],
      ["✋", "It's a hand.", true],
      ["🐜", "It's a bag.", false],
    ],
    fillBlank: [
      ["🍎", "I have an ___.", "apple", "ant", "hat"],
      ["🎩", "This is a ___.", "hat", "hand", "bag"],
      ["👜", "It's a big ___.", "bag", "apple", "ant"],
    ],
    rearrange: [
      ["🍎", "I have an apple."],
      ["👜", "This is my bag."],
      ["🎩", "It is a hat."],
    ],
    reading: {
      title: "At the market",
      emoji: "🛒",
      passage: "I am at the market with my mum. I have a bag. I see an apple. It is red.",
      items: [
        { type: "tf", sentence: "I am at the market.", answer: true },
        { type: "tf", sentence: "The apple is green.", answer: false },
        {
          type: "mc",
          question: "What do I see?",
          answer: "an apple",
          options: ["an apple", "an ant", "a hat"],
        },
      ],
    },
  },
  {
    code: "unit-04",
    en: "Unit 4: In the bedroom",
    vi: "Trong phòng ngủ",
    emoji: "🛏️",
    words: [
      ["bed", "cái giường", "🛏️"],
      ["door", "cửa ra vào", "🚪"],
      ["dog", "con chó", "🐕"],
      ["duck", "con vịt", "🦆"],
      ["doll", "búp bê", "🪆"],
    ],
    trueFalse: [
      ["🚪", "This is a door.", true],
      ["🐕", "This is a duck.", false],
      ["🛏️", "It's a bed.", true],
      ["🪆", "It's a dog.", false],
    ],
    fillBlank: [
      ["🐕", "This is my ___.", "dog", "door", "duck"],
      ["🦆", "I can see a ___.", "duck", "doll", "bed"],
      ["🚪", "Open the ___, please.", "door", "dog", "doll"],
    ],
    rearrange: [
      ["🐕", "This is my dog."],
      ["🛏️", "It is my bed."],
      ["🚪", "Open the door."],
    ],
    reading: {
      title: "My bedroom",
      emoji: "🛏️",
      passage: "This is my bedroom. I have a bed and a doll. My dog is on the bed.",
      items: [
        { type: "tf", sentence: "I have a doll.", answer: true },
        { type: "tf", sentence: "The duck is on the bed.", answer: false },
        {
          type: "mc",
          question: "What is on the bed?",
          answer: "my dog",
          options: ["my dog", "my duck", "my door"],
        },
      ],
    },
  },
  {
    code: "unit-05",
    en: "Unit 5: At the fish and chip shop",
    vi: "Ở cửa hàng cá và khoai tây chiên",
    emoji: "🍟",
    words: [
      ["fish", "con cá", "🐟"],
      ["chips", "khoai tây chiên", "🍟"],
      ["milk", "sữa", "🥛"],
      ["juice", "nước hoa quả", "🧃"],
    ],
    trueFalse: [
      ["🐟", "This is fish.", true],
      ["🥛", "This is juice.", false],
      ["🍟", "I like chips.", true],
      ["🧃", "It's milk.", false],
    ],
    fillBlank: [
      ["🍟", "I like ___.", "chips", "milk", "fish"],
      ["🥛", "I want some ___.", "milk", "chips", "fish"],
      ["🐟", "I like ___ and chips.", "fish", "juice", "milk"],
    ],
    rearrange: [
      ["🍟", "I like chips."],
      ["🥛", "I want some milk."],
      ["🐟", "I like fish."],
    ],
    reading: {
      title: "Lunch time",
      emoji: "🍽️",
      passage: "I am at the fish and chip shop. I like fish and chips. My sister likes milk.",
      items: [
        { type: "tf", sentence: "I like fish and chips.", answer: true },
        { type: "tf", sentence: "My sister likes juice.", answer: false },
        {
          type: "mc",
          question: "What does my sister like?",
          answer: "milk",
          options: ["milk", "juice", "fish"],
        },
      ],
    },
  },
  {
    code: "unit-06",
    en: "Unit 6: In the classroom",
    vi: "Trong lớp học",
    emoji: "✏️",
    words: [
      ["pen", "cái bút mực", "🖊️"],
      ["pencil", "cái bút chì", "✏️"],
      ["ruler", "cái thước", "📏"],
      ["egg", "quả trứng", "🥚"],
      ["ten", "số mười", "🔟", "number"],
    ],
    trueFalse: [
      ["✏️", "This is a pencil.", true],
      ["📏", "This is a pen.", false],
      ["🥚", "It's an egg.", true],
      ["🖊️", "It's a ruler.", false],
    ],
    fillBlank: [
      ["🖊️", "This is my ___.", "pen", "egg", "ten"],
      ["📏", "I have a ___.", "ruler", "pencil", "egg"],
      ["🔟", "I can count to ___.", "ten", "pen", "egg"],
    ],
    rearrange: [
      ["✏️", "This is my pencil."],
      ["📏", "I have a ruler."],
      ["🖊️", "It is a pen."],
    ],
    reading: {
      title: "My classroom",
      emoji: "🏫",
      passage: "This is my classroom. I have a pen and a pencil. I do not have a ruler.",
      items: [
        { type: "tf", sentence: "I have a pencil.", answer: true },
        { type: "tf", sentence: "I have a ruler.", answer: false },
        {
          type: "mc",
          question: "Where am I?",
          answer: "in my classroom",
          options: ["in my classroom", "in my bedroom", "at the market"],
        },
      ],
    },
  },
  {
    code: "unit-07",
    en: "Unit 7: In the garden",
    vi: "Trong vườn",
    emoji: "🌷",
    words: [
      ["flower", "bông hoa", "🌸"],
      ["tree", "cái cây", "🌳"],
      ["girl", "bạn gái", "👧"],
      ["goat", "con dê", "🐐"],
      ["grapes", "quả nho", "🍇"],
    ],
    trueFalse: [
      ["🌸", "This is a flower.", true],
      ["🐐", "This is a girl.", false],
      ["🌳", "It's a tree.", true],
      ["🍇", "It's a goat.", false],
    ],
    fillBlank: [
      ["🐐", "I can see a ___.", "goat", "girl", "tree"],
      ["🍇", "I like ___.", "grapes", "goats", "trees"],
      ["🌳", "This is a big ___.", "tree", "flower", "girl"],
    ],
    rearrange: [
      ["🌸", "This is a flower."],
      ["🐐", "I can see a goat."],
      ["👧", "She is a girl."],
    ],
    reading: {
      title: "In the garden",
      emoji: "🌷",
      passage: "I am in the garden. I can see a big tree and a goat. The flowers are pink.",
      items: [
        { type: "tf", sentence: "I can see a goat.", answer: true },
        { type: "tf", sentence: "The tree is small.", answer: false },
        {
          type: "mc",
          question: "What colour are the flowers?",
          answer: "pink",
          options: ["pink", "blue", "black"],
        },
      ],
    },
  },
  {
    code: "unit-08",
    en: "Unit 8: In the park",
    vi: "Ở công viên",
    emoji: "🪁",
    words: [
      ["horse", "con ngựa", "🐎"],
      ["house", "ngôi nhà", "🏠"],
      ["hen", "con gà mái", "🐔"],
      ["kite", "con diều", "🪁"],
      ["boy", "bạn trai", "👦"],
    ],
    trueFalse: [
      ["🐎", "This is a horse.", true],
      ["🐔", "This is a house.", false],
      ["🪁", "It's a kite.", true],
      ["👦", "It's a hen.", false],
    ],
    fillBlank: [
      ["🪁", "I have a ___.", "kite", "horse", "hen"],
      ["🐔", "I can see a ___.", "hen", "house", "boy"],
      ["👦", "He is a ___.", "boy", "kite", "hen"],
    ],
    rearrange: [
      ["🪁", "I have a kite."],
      ["🐎", "I can see a horse."],
      ["👦", "He is a boy."],
    ],
    reading: {
      title: "In the park",
      emoji: "🌳",
      passage: "This is Tom. He is in the park. He has a red kite. He can see a horse.",
      items: [
        { type: "tf", sentence: "Tom is in the park.", answer: true },
        { type: "tf", sentence: "Tom's kite is blue.", answer: false },
        {
          type: "mc",
          question: "What can Tom see?",
          answer: "a horse",
          options: ["a horse", "a hen", "a house"],
        },
      ],
    },
  },
  {
    code: "unit-09",
    en: "Unit 9: In the shop",
    vi: "Trong cửa hàng",
    emoji: "📦",
    words: [
      ["box", "cái hộp", "📦"],
      ["clock", "đồng hồ", "🕰️"],
      ["orange", "quả cam", "🍊"],
      ["sock", "cái tất", "🧦"],
    ],
    trueFalse: [
      ["📦", "This is a box.", true],
      ["🍊", "This is a clock.", false],
      ["🧦", "It's a sock.", true],
      ["🕰️", "It's an orange.", false],
    ],
    fillBlank: [
      ["🕰️", "This is a ___.", "clock", "sock", "box"],
      ["🍊", "I have an ___.", "orange", "box", "clock"],
      ["📦", "It's a big ___.", "box", "sock", "orange"],
    ],
    rearrange: [
      ["📦", "This is a box."],
      ["🍊", "I have an orange."],
      ["🧦", "It is a sock."],
    ],
    reading: {
      title: "At the shop",
      emoji: "🏪",
      passage: "I am in the shop. I can see a clock and a box. In the box, there are socks.",
      items: [
        { type: "tf", sentence: "I can see a clock.", answer: true },
        { type: "tf", sentence: "There are oranges in the box.", answer: false },
        {
          type: "mc",
          question: "What is in the box?",
          answer: "socks",
          options: ["socks", "oranges", "clocks"],
        },
      ],
    },
  },
  {
    code: "unit-10",
    en: "Unit 10: At the zoo",
    vi: "Ở sở thú",
    emoji: "🐒",
    words: [
      ["monkey", "con khỉ", "🐒"],
      ["mouse", "con chuột", "🐁"],
      ["mango", "quả xoài", "🥭"],
      ["lion", "con sư tử", "🦁"],
      ["tiger", "con hổ", "🐅"],
    ],
    trueFalse: [
      ["🐒", "This is a monkey.", true],
      ["🦁", "This is a tiger.", false],
      ["🐁", "It's a mouse.", true],
      ["🥭", "It's a lion.", false],
    ],
    fillBlank: [
      ["🐒", "I can see a ___.", "monkey", "mango", "mouse"],
      ["🥭", "The monkey likes the ___.", "mango", "mouse", "lion"],
      ["🐅", "It's a big ___.", "tiger", "mouse", "mango"],
    ],
    rearrange: [
      ["🐒", "I can see a monkey."],
      ["🦁", "It is a lion."],
      ["🥭", "I like mangoes."],
    ],
    reading: {
      title: "At the zoo",
      emoji: "🦁",
      passage: "We are at the zoo. I can see a lion and a tiger. The monkey has a mango.",
      items: [
        { type: "tf", sentence: "I can see a tiger.", answer: true },
        { type: "tf", sentence: "The lion has a mango.", answer: false },
        {
          type: "mc",
          question: "Who has a mango?",
          answer: "the monkey",
          options: ["the monkey", "the lion", "the tiger"],
        },
      ],
    },
  },
  {
    code: "unit-11",
    en: "Unit 11: At the bus stop",
    vi: "Ở bến xe buýt",
    emoji: "🚌",
    words: [
      ["bus", "xe buýt", "🚌"],
      ["sun", "mặt trời", "☀️"],
      ["umbrella", "cái ô", "☂️"],
      ["truck", "xe tải", "🚚"],
      ["taxi", "xe taxi", "🚕"],
    ],
    trueFalse: [
      ["🚌", "This is a bus.", true],
      ["🚕", "This is a truck.", false],
      ["☂️", "It's an umbrella.", true],
      ["☀️", "It's a taxi.", false],
    ],
    fillBlank: [
      ["🚌", "I can see a ___.", "bus", "sun", "truck"],
      ["☂️", "I have an ___.", "umbrella", "taxi", "bus"],
      ["🚕", "It's a yellow ___.", "taxi", "sun", "umbrella"],
    ],
    rearrange: [
      ["🚌", "I can see a bus."],
      ["☂️", "I have an umbrella."],
      ["🚕", "It is a taxi."],
    ],
    reading: {
      title: "At the bus stop",
      emoji: "🚏",
      passage: "I am at the bus stop with my dad. It is sunny. I can see a big truck and a yellow taxi.",
      items: [
        { type: "tf", sentence: "It is sunny.", answer: true },
        { type: "tf", sentence: "The taxi is red.", answer: false },
        {
          type: "mc",
          question: "Who is with me?",
          answer: "my dad",
          options: ["my dad", "my mum", "my sister"],
        },
      ],
    },
  },
  {
    code: "unit-12",
    en: "Unit 12: At the lake",
    vi: "Ở hồ",
    emoji: "🏞️",
    words: [
      ["lake", "cái hồ", "🏞️"],
      ["leaf", "chiếc lá", "🍃"],
      ["lemon", "quả chanh", "🍋"],
      ["boat", "con thuyền", "⛵"],
      ["frog", "con ếch", "🐸"],
    ],
    trueFalse: [
      ["⛵", "This is a boat.", true],
      ["🍋", "This is a leaf.", false],
      ["🐸", "It's a frog.", true],
      ["🏞️", "It's a lemon.", false],
    ],
    fillBlank: [
      ["🍃", "This is a green ___.", "leaf", "lemon", "lake"],
      ["⛵", "I can see a ___.", "boat", "frog", "leaf"],
      ["🍋", "It's a yellow ___.", "lemon", "boat", "frog"],
    ],
    rearrange: [
      ["⛵", "I can see a boat."],
      ["🐸", "It is a frog."],
      ["🍃", "This is a leaf."],
    ],
    reading: {
      title: "At the lake",
      emoji: "🏞️",
      passage: "Look at the lake! There is a boat on the lake. A frog is on a big leaf.",
      items: [
        { type: "tf", sentence: "There is a boat on the lake.", answer: true },
        { type: "tf", sentence: "The frog is on a lemon.", answer: false },
        {
          type: "mc",
          question: "Where is the frog?",
          answer: "on a leaf",
          options: ["on a leaf", "on a boat", "on a lemon"],
        },
      ],
    },
  },
  {
    code: "unit-13",
    en: "Unit 13: In the school canteen",
    vi: "Ở căng tin trường",
    emoji: "🍜",
    words: [
      ["noodles", "mì", "🍜"],
      ["nuts", "các loại hạt", "🥜"],
      ["rice", "cơm", "🍚"],
      ["bread", "bánh mì", "🍞"],
      ["banana", "quả chuối", "🍌"],
    ],
    trueFalse: [
      ["🍜", "These are noodles.", true],
      ["🍚", "This is bread.", false],
      ["🍌", "It's a banana.", true],
      ["🥜", "This is rice.", false],
    ],
    fillBlank: [
      ["🍜", "I like ___.", "noodles", "nuts", "bread"],
      ["🍚", "I want some ___.", "rice", "bananas", "nuts"],
      ["🍞", "This is my ___.", "bread", "rice", "noodles"],
    ],
    rearrange: [
      ["🍜", "I like noodles."],
      ["🍚", "I want some rice."],
      ["🍌", "This is a banana."],
    ],
    reading: {
      title: "In the canteen",
      emoji: "🍽️",
      passage:
        "It is lunch time. I am in the school canteen. I have rice and a banana. My friend has noodles.",
      items: [
        { type: "tf", sentence: "I have rice.", answer: true },
        { type: "tf", sentence: "My friend has bread.", answer: false },
        {
          type: "mc",
          question: "What does my friend have?",
          answer: "noodles",
          options: ["noodles", "rice", "nuts"],
        },
      ],
    },
  },
  {
    code: "unit-14",
    en: "Unit 14: In the toy shop",
    vi: "Ở cửa hàng đồ chơi",
    emoji: "🧸",
    words: [
      ["teddy bear", "gấu bông", "🧸"],
      ["train", "tàu hoả", "🚂"],
      ["robot", "người máy", "🤖"],
      ["drum", "cái trống", "🥁"],
      ["yo-yo", "con quay yo-yo", "🪀"],
    ],
    trueFalse: [
      ["🧸", "This is a teddy bear.", true],
      ["🤖", "This is a train.", false],
      ["🥁", "It's a drum.", true],
      ["🚂", "It's a robot.", false],
    ],
    fillBlank: [
      ["🤖", "I have a ___.", "robot", "drum", "train"],
      ["🚂", "This is a ___.", "train", "robot", "drum"],
      ["🥁", "I like the ___.", "drum", "train", "robot"],
    ],
    rearrange: [
      ["🧸", "I have a teddy bear."],
      ["🤖", "This is a robot."],
      ["🚂", "I like the train."],
    ],
    reading: {
      title: "In the toy shop",
      emoji: "🧸",
      passage: "I am in the toy shop. There are a lot of toys. I like the robot. My brother likes the train.",
      items: [
        { type: "tf", sentence: "I like the robot.", answer: true },
        { type: "tf", sentence: "My brother likes the drum.", answer: false },
        {
          type: "mc",
          question: "What does my brother like?",
          answer: "the train",
          options: ["the train", "the robot", "the drum"],
        },
      ],
    },
  },
  {
    code: "unit-15",
    en: "Unit 15: At the football match",
    vi: "Ở trận bóng đá",
    emoji: "🥅",
    words: [
      ["football", "bóng đá", "⚽"],
      ["face", "khuôn mặt", "😊"],
      ["foot", "bàn chân", "🦶"],
      ["father", "bố", "👨"],
      ["flag", "lá cờ", "🚩"],
    ],
    trueFalse: [
      ["🚩", "This is a flag.", true],
      ["🦶", "This is a face.", false],
      ["👨", "He is my father.", true],
      ["😊", "It's a foot.", false],
    ],
    fillBlank: [
      ["⚽", "I like ___.", "football", "flag", "foot"],
      ["👨", "This is my ___.", "father", "face", "flag"],
      ["🚩", "I have a red ___.", "flag", "foot", "father"],
    ],
    rearrange: [
      ["⚽", "I like football."],
      ["👨", "This is my father."],
      ["🚩", "I have a flag."],
    ],
    reading: {
      title: "The football match",
      emoji: "🥅",
      passage: "I am at the football match with my father. We have a red flag. We are happy.",
      items: [
        { type: "tf", sentence: "I am with my father.", answer: true },
        { type: "tf", sentence: "The flag is blue.", answer: false },
        {
          type: "mc",
          question: "Where am I?",
          answer: "at the football match",
          options: ["at the football match", "at the zoo", "at the lake"],
        },
      ],
    },
  },
  {
    code: "unit-16",
    en: "Unit 16: At home",
    vi: "Ở nhà",
    emoji: "🏡",
    words: [
      ["window", "cửa sổ", "🪟"],
      ["water", "nước", "💧"],
      ["mother", "mẹ", "👩"],
      ["baby", "em bé", "👶"],
      ["grandma", "bà", "👵"],
    ],
    trueFalse: [
      ["👩", "She is my mother.", true],
      ["👶", "This is my grandma.", false],
      ["🪟", "It's a window.", true],
      ["💧", "It's a baby.", false],
    ],
    fillBlank: [
      ["👶", "This is a ___.", "baby", "window", "water"],
      ["💧", "I want some ___.", "water", "baby", "window"],
      ["👵", "She is my ___.", "grandma", "baby", "window"],
    ],
    rearrange: [
      ["👩", "This is my mother."],
      ["💧", "I want some water."],
      ["👶", "She is a baby."],
    ],
    reading: {
      title: "My family",
      emoji: "🏡",
      passage: "This is my home. This is my mother. This is my grandma. And this is my baby brother.",
      items: [
        { type: "tf", sentence: "I have a baby brother.", answer: true },
        { type: "tf", sentence: "I have a baby sister.", answer: false },
        {
          type: "mc",
          question: "Who is in my home?",
          answer: "my grandma",
          options: ["my grandma", "my teacher", "my friend"],
        },
      ],
    },
  },
];
