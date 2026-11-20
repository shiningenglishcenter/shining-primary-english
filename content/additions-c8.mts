/**
 * Teacher feedback C8 (2026-11-20): every sentence activity should have at
 * least 6 questions. These items are APPENDED to the packs in
 * content/starters.mts and content/gs1.mts by scripts/build-content.mts:
 *
 *   - migrations 0014/0016/0017 keep the original lists (unchanged);
 *   - migration 0025 replaces an activity's content with original + these
 *     items ONLY when the stored content is still exactly the original
 *     (a teacher who edited an activity keeps their version).
 *
 * Original sentences written for SHINING. Word games with fewer than 6 words
 * are padded in the round builder instead (src/features/practice/round.ts).
 */
import type { FillBlank, ReadingItem, Rearrange, TrueFalse } from "./starters.mts";

export type Additions = {
  trueFalse?: TrueFalse[];
  fillBlank?: FillBlank[];
  rearrange?: Rearrange[];
  reading?: ReadingItem[];
};

export const STARTERS: Record<string, Additions> = {
  animals: {
    fillBlank: [["🐘", "The ___ is big and grey.", "elephant", "mouse", "bird"]],
    rearrange: [
      ["🦒", "The giraffe is tall."],
      ["🐦", "Birds can fly."],
    ],
  },
  colours: {
    fillBlank: [["🍌", "My banana is ___.", "yellow", "blue", "purple"]],
    rearrange: [
      ["🌳", "The tree is green."],
      ["🐑", "The sheep is white."],
    ],
  },
  food: {
    fillBlank: [["🍌", "Monkeys like ___.", "bananas", "milk", "bread"]],
    rearrange: [
      ["🍎", "I have got an apple."],
      ["🥛", "I drink milk."],
    ],
  },
  body: {
    fillBlank: [["👄", "I eat with my ___.", "mouth", "ear", "foot"]],
    rearrange: [
      ["👃", "Touch your nose."],
      ["✋", "Clap your hands."],
    ],
  },
  clothes: {
    fillBlank: [["👟", "Put on your ___. Let's go!", "shoes", "glasses", "hat"]],
    rearrange: [
      ["🧦", "My socks are blue."],
      ["👒", "I like your hat."],
    ],
  },
  toys: {
    fillBlank: [["🥁", "Bang the ___!", "drum", "kite", "teddy bear"]],
    rearrange: [
      ["🪁", "Let's fly the kite."],
      ["🧸", "This is my teddy bear."],
    ],
  },
  school: {
    fillBlank: [["✏️", "Write your name with a ___.", "pencil", "chair", "computer"]],
    rearrange: [
      ["🪑", "Sit down, please."],
      ["📏", "I have got a ruler."],
    ],
  },
  home: {
    fillBlank: [["🛋️", "Grandma is sitting on the ___.", "sofa", "window", "clock"]],
    rearrange: [
      ["🛏️", "This is my bed."],
      ["📺", "Let's watch television."],
    ],
  },
  numbers: {
    fillBlank: [["🐦", "A bird has got ___ legs.", "two", "four", "eight"]],
    rearrange: [
      ["🐕", "I have got one dog."],
      ["🍌", "There are five bananas."],
    ],
  },
  family: {
    fillBlank: [["👴", "My ___ has got glasses.", "grandfather", "baby", "girl"]],
    rearrange: [
      ["👶", "The baby is sleeping."],
      ["👵", "This is my grandmother."],
    ],
  },
  transport: {
    fillBlank: [["🚂", "The ___ is long.", "train", "bike", "boat"]],
    rearrange: [
      ["🚌", "We go by bus."],
      ["⛵", "The boat is on the water."],
    ],
  },
  nature: {
    fillBlank: [["🌊", "Fish live in the ___.", "sea", "sun", "tree"]],
    rearrange: [
      ["☀️", "The sun is hot."],
      ["🐚", "I have got a shell."],
    ],
  },
};

export const GS1: Record<string, Additions> = {
  "unit-01": {
    trueFalse: [
      ["📖", "This is a book.", true],
      ["⚽", "It's a balloon.", false],
    ],
    fillBlank: [
      ["⚽", "Kick the ___!", "ball", "book", "bell"],
      ["🔔", "Ring the ___!", "bell", "bike", "balloon"],
      ["📖", "Open your ___.", "book", "ball", "bike"],
    ],
    rearrange: [
      ["🎈", "It is a balloon."],
      ["🔔", "This is a bell."],
      ["📖", "I have a book."],
    ],
    reading: [
      { type: "tf", sentence: "Ben has a bike.", answer: true },
      { type: "tf", sentence: "Ben has a book.", answer: false },
      {
        type: "mc",
        question: "What is this?",
        answer: "my school",
        options: ["my school", "my house", "my bike"],
      },
    ],
  },
  "unit-02": {
    trueFalse: [
      ["🚗", "This is a car.", true],
      ["🎂", "It's a cookie.", false],
    ],
    fillBlank: [
      ["☕", "This is my ___.", "cup", "cat", "cake"],
      ["🎂", "Happy birthday! Here is a ___.", "cake", "car", "cup"],
      ["🐈", "The ___ is small.", "cat", "car", "cookie"],
    ],
    rearrange: [
      ["🚗", "I have a car."],
      ["🍪", "I like cookies."],
      ["🎂", "It is a cake."],
    ],
    reading: [
      { type: "tf", sentence: "Kitty can see a cake.", answer: true },
      { type: "tf", sentence: "Kitty is in the car.", answer: false },
      {
        type: "mc",
        question: "What can Kitty see?",
        answer: "a cake",
        options: ["a cake", "a car", "a cup"],
      },
    ],
  },
  "unit-03": {
    trueFalse: [
      ["🎩", "This is a hat.", true],
      ["🍎", "It's an ant.", false],
    ],
    fillBlank: [
      ["🐜", "The ___ is small.", "ant", "bag", "hat"],
      ["✋", "Wave your ___.", "hand", "hat", "apple"],
      ["🍎", "The ___ is red.", "apple", "bag", "ant"],
    ],
    rearrange: [
      ["🐜", "I can see an ant."],
      ["✋", "This is my hand."],
      ["👜", "It is a bag."],
    ],
    reading: [
      { type: "tf", sentence: "I am with my mum.", answer: true },
      { type: "tf", sentence: "I have a hat.", answer: false },
      { type: "mc", question: "Who is with me?", answer: "my mum", options: ["my mum", "my dad", "my cat"] },
    ],
  },
  "unit-04": {
    trueFalse: [
      ["🦆", "This is a duck.", true],
      ["🚪", "It's a bed.", false],
    ],
    fillBlank: [
      ["🛏️", "I sleep in my ___.", "bed", "dog", "duck"],
      ["🪆", "This is my ___.", "doll", "door", "dog"],
      ["🐕", "The ___ is brown.", "dog", "bed", "door"],
    ],
    rearrange: [
      ["🪆", "I have a doll."],
      ["🦆", "I can see a duck."],
      ["🛏️", "This is my bed."],
    ],
    reading: [
      { type: "tf", sentence: "I have a bed.", answer: true },
      { type: "tf", sentence: "My dog is on the door.", answer: false },
      {
        type: "mc",
        question: "Where am I?",
        answer: "in my bedroom",
        options: ["in my bedroom", "at school", "at the zoo"],
      },
    ],
  },
  "unit-05": {
    trueFalse: [
      ["🧃", "This is juice.", true],
      ["🐟", "It's chips.", false],
    ],
    fillBlank: [
      ["🧃", "I like orange ___.", "juice", "fish", "chips"],
      ["🐟", "This is a ___.", "fish", "milk", "juice"],
      ["🥛", "The ___ is white.", "milk", "fish", "chips"],
    ],
    rearrange: [
      ["🧃", "I want some juice."],
      ["🐟", "This is a fish."],
      ["🥛", "I like milk."],
    ],
    reading: [
      { type: "tf", sentence: "I am at the fish and chip shop.", answer: true },
      { type: "tf", sentence: "My sister likes chips.", answer: false },
      {
        type: "mc",
        question: "What do I like?",
        answer: "fish and chips",
        options: ["fish and chips", "milk", "juice"],
      },
    ],
  },
  "unit-06": {
    trueFalse: [
      ["🖊️", "This is a pen.", true],
      ["🔟", "It's an egg.", false],
    ],
    fillBlank: [
      ["✏️", "This is my ___.", "pencil", "egg", "ten"],
      ["🥚", "I have an ___.", "egg", "pen", "ruler"],
      ["🖊️", "Write with a ___.", "pen", "egg", "ten"],
    ],
    rearrange: [
      ["🥚", "I have an egg."],
      ["🔟", "I can count to ten."],
      ["✏️", "It is a pencil."],
    ],
    reading: [
      { type: "tf", sentence: "I have a pen.", answer: true },
      { type: "tf", sentence: "I am in my bedroom.", answer: false },
      {
        type: "mc",
        question: "What do I not have?",
        answer: "a ruler",
        options: ["a ruler", "a pen", "a pencil"],
      },
    ],
  },
  "unit-07": {
    trueFalse: [
      ["👧", "She is a girl.", true],
      ["🌳", "It's a flower.", false],
    ],
    fillBlank: [
      ["🌸", "This is a pink ___.", "flower", "goat", "tree"],
      ["👧", "She is a ___.", "girl", "goat", "tree"],
      ["🐐", "The ___ is white.", "goat", "girl", "flower"],
    ],
    rearrange: [
      ["🌳", "It is a big tree."],
      ["🍇", "I like grapes."],
      ["🌸", "I can see a flower."],
    ],
    reading: [
      { type: "tf", sentence: "I am in the garden.", answer: true },
      { type: "tf", sentence: "The flowers are blue.", answer: false },
      {
        type: "mc",
        question: "Where am I?",
        answer: "in the garden",
        options: ["in the garden", "at the zoo", "in the shop"],
      },
    ],
  },
  "unit-08": {
    trueFalse: [
      ["🏠", "This is a house.", true],
      ["🐎", "It's a kite.", false],
    ],
    fillBlank: [
      ["🐎", "I can see a ___.", "horse", "house", "kite"],
      ["🏠", "This is my ___.", "house", "hen", "horse"],
      ["🪁", "The ___ is red.", "kite", "hen", "boy"],
    ],
    rearrange: [
      ["🐔", "I can see a hen."],
      ["🏠", "This is my house."],
      ["🪁", "The kite is red."],
    ],
    reading: [
      { type: "tf", sentence: "Tom has a kite.", answer: true },
      { type: "tf", sentence: "Tom can see a hen.", answer: false },
      {
        type: "mc",
        question: "What colour is Tom's kite?",
        answer: "red",
        options: ["red", "blue", "green"],
      },
    ],
  },
  "unit-09": {
    trueFalse: [
      ["🍊", "This is an orange.", true],
      ["🧦", "It's a box.", false],
    ],
    fillBlank: [
      ["🧦", "This is my ___.", "sock", "clock", "orange"],
      ["🕰️", "Look at the ___.", "clock", "sock", "orange"],
      ["🍊", "The ___ is orange.", "orange", "box", "sock"],
    ],
    rearrange: [
      ["🕰️", "This is a clock."],
      ["🧦", "I have a sock."],
      ["📦", "It is a big box."],
    ],
    reading: [
      { type: "tf", sentence: "I can see a box.", answer: true },
      { type: "tf", sentence: "I am in the park.", answer: false },
      {
        type: "mc",
        question: "Where am I?",
        answer: "in the shop",
        options: ["in the shop", "in the park", "at home"],
      },
    ],
  },
  "unit-10": {
    trueFalse: [
      ["🐅", "This is a tiger.", true],
      ["🐒", "It's a mouse.", false],
    ],
    fillBlank: [
      ["🦁", "I can see a ___.", "lion", "mango", "mouse"],
      ["🐁", "The ___ is small.", "mouse", "lion", "tiger"],
      ["🐒", "The ___ likes mangoes.", "monkey", "mouse", "tiger"],
    ],
    rearrange: [
      ["🐅", "It is a tiger."],
      ["🐁", "I can see a mouse."],
      ["🥭", "This is a mango."],
    ],
    reading: [
      { type: "tf", sentence: "We are at the zoo.", answer: true },
      { type: "tf", sentence: "The tiger has a mango.", answer: false },
      {
        type: "mc",
        question: "Where are we?",
        answer: "at the zoo",
        options: ["at the zoo", "at the lake", "at school"],
      },
    ],
  },
  "unit-11": {
    trueFalse: [
      ["🚚", "This is a truck.", true],
      ["🚌", "It's a taxi.", false],
    ],
    fillBlank: [
      ["☀️", "The ___ is hot.", "sun", "bus", "taxi"],
      ["🚚", "It's a big ___.", "truck", "sun", "umbrella"],
      ["🚌", "We go to school by ___.", "bus", "sun", "umbrella"],
    ],
    rearrange: [
      ["🚚", "I can see a truck."],
      ["☀️", "The sun is hot."],
      ["🚌", "This is a bus."],
    ],
    reading: [
      { type: "tf", sentence: "I am with my dad.", answer: true },
      { type: "tf", sentence: "I can see a small truck.", answer: false },
      {
        type: "mc",
        question: "What colour is the taxi?",
        answer: "yellow",
        options: ["yellow", "red", "blue"],
      },
    ],
  },
  "unit-12": {
    trueFalse: [
      ["🍋", "This is a lemon.", true],
      ["🐸", "It's a boat.", false],
    ],
    fillBlank: [
      ["🐸", "The ___ is green.", "frog", "lemon", "boat"],
      ["🏞️", "Look at the ___!", "lake", "lemon", "frog"],
      ["⛵", "The ___ is on the lake.", "boat", "leaf", "lemon"],
    ],
    rearrange: [
      ["🍋", "This is a lemon."],
      ["🏞️", "Look at the lake."],
      ["🐸", "I can see a frog."],
    ],
    reading: [
      { type: "tf", sentence: "The frog is on a leaf.", answer: true },
      { type: "tf", sentence: "The leaf is small.", answer: false },
      {
        type: "mc",
        question: "What is on the lake?",
        answer: "a boat",
        options: ["a boat", "a frog", "a lemon"],
      },
    ],
  },
  "unit-13": {
    trueFalse: [
      ["🍞", "This is bread.", true],
      ["🍌", "These are noodles.", false],
    ],
    fillBlank: [
      ["🍌", "I have a ___.", "banana", "rice", "nuts"],
      ["🥜", "These are ___.", "nuts", "bread", "rice"],
      ["🍜", "My friend has ___.", "noodles", "bananas", "nuts"],
    ],
    rearrange: [
      ["🍞", "I like bread."],
      ["🥜", "These are nuts."],
      ["🍌", "I have a banana."],
    ],
    reading: [
      { type: "tf", sentence: "I have a banana.", answer: true },
      { type: "tf", sentence: "I am at home.", answer: false },
      {
        type: "mc",
        question: "What do I have?",
        answer: "rice and a banana",
        options: ["rice and a banana", "noodles", "bread"],
      },
    ],
  },
  "unit-14": {
    trueFalse: [
      ["🚂", "This is a train.", true],
      ["🥁", "It's a teddy bear.", false],
    ],
    fillBlank: [
      ["🧸", "I have a teddy ___.", "bear", "drum", "train"],
      ["🪀", "This is a ___.", "yo-yo", "train", "drum"],
      ["🥁", "Bang the ___!", "drum", "robot", "train"],
    ],
    rearrange: [
      ["🥁", "I have a drum."],
      ["🪀", "This is my yo-yo."],
      ["🤖", "I like the robot."],
    ],
    reading: [
      { type: "tf", sentence: "I am in the toy shop.", answer: true },
      { type: "tf", sentence: "There are two toys.", answer: false },
      {
        type: "mc",
        question: "What do I like?",
        answer: "the robot",
        options: ["the robot", "the train", "the drum"],
      },
    ],
  },
  "unit-15": {
    trueFalse: [
      ["🦶", "It's a foot.", true],
      ["🚩", "This is a ball.", false],
    ],
    fillBlank: [
      ["😊", "This is my ___.", "face", "flag", "foot"],
      ["🦶", "Kick with your ___.", "foot", "face", "flag"],
      ["⚽", "Let's play ___!", "football", "father", "face"],
    ],
    rearrange: [
      ["😊", "This is my face."],
      ["🦶", "This is my foot."],
      ["👨", "My father likes football."],
    ],
    reading: [
      { type: "tf", sentence: "We have a flag.", answer: true },
      { type: "tf", sentence: "We are sad.", answer: false },
      {
        type: "mc",
        question: "Who is with me?",
        answer: "my father",
        options: ["my father", "my mother", "my teacher"],
      },
    ],
  },
  "unit-16": {
    trueFalse: [
      ["👵", "She is my grandma.", true],
      ["🪟", "It's water.", false],
    ],
    fillBlank: [
      ["🪟", "Look out of the ___.", "window", "water", "baby"],
      ["👩", "She is my ___.", "mother", "window", "water"],
      ["👶", "The ___ is sleeping.", "baby", "water", "window"],
    ],
    rearrange: [
      ["👵", "This is my grandma."],
      ["🪟", "This is a window."],
      ["👶", "I have a baby brother."],
    ],
    reading: [
      { type: "tf", sentence: "This is my mother.", answer: true },
      { type: "tf", sentence: "This is my school.", answer: false },
      {
        type: "mc",
        question: "Who is the baby?",
        answer: "my brother",
        options: ["my brother", "my sister", "my mother"],
      },
    ],
  },
};
