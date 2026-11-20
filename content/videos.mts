/**
 * Video listening activities (D31): popular children's songs on YouTube,
 * embedded with youtube-nocookie (nothing is copied or hosted here), each
 * with a few questions about what the song clearly says or shows.
 *
 * Videos come from the official Super Simple Songs channel, picked from
 * search results; they could not be played from the build environment, so
 * teachers should watch each once and swap the link in the editor if a
 * video is unavailable or the questions do not fit.
 */
import type { ReadingItem } from "./starters.mts";

export type VideoActivity = {
  level: "STARTERS" | "GS1";
  topic: string;
  en: string;
  vi: string;
  videoId: string;
  items: ReadingItem[];
};

const blue: ReadingItem[] = [
  { type: "tf", sentence: "This song is about colours.", answer: true },
  {
    type: "mc",
    question: "Which colour is in the song?",
    answer: "purple",
    options: ["purple", "black", "brown"],
  },
  { type: "tf", sentence: "The song says “I see something blue”.", answer: true },
  { type: "mc", question: "What is the first colour?", answer: "blue", options: ["blue", "green", "white"] },
];
const jungle: ReadingItem[] = [
  {
    type: "mc",
    question: "Where are they walking?",
    answer: "in the jungle",
    options: ["in the jungle", "in the park", "in the sea"],
  },
  { type: "tf", sentence: "They are afraid.", answer: false },
  {
    type: "mc",
    question: "Which animal is in the song?",
    answer: "a monkey",
    options: ["a monkey", "a cow", "a sheep"],
  },
  { type: "tf", sentence: "There is an elephant in the song.", answer: true },
];
const body: ReadingItem[] = [
  { type: "tf", sentence: "The song is about the body.", answer: true },
  {
    type: "mc",
    question: "Which word is in the song?",
    answer: "knees",
    options: ["knees", "hands", "hair"],
  },
  { type: "tf", sentence: "The song says “eyes and ears and mouth and nose”.", answer: true },
  { type: "tf", sentence: "The song gets slower and slower.", answer: false },
];
const broccoli: ReadingItem[] = [
  { type: "tf", sentence: "The song is about food.", answer: true },
  {
    type: "mc",
    question: "Do you like broccoli ice cream?",
    answer: "No, I don't.",
    options: ["No, I don't.", "Yes, I do.", "Yes, it is."],
  },
  {
    type: "mc",
    question: "Do you like ice cream?",
    answer: "Yes, I do.",
    options: ["Yes, I do.", "No, I don't.", "No, it isn't."],
  },
  { type: "tf", sentence: "Broccoli ice cream is a funny food.", answer: true },
];
const seven: ReadingItem[] = [
  { type: "tf", sentence: "The song counts to seven.", answer: true },
  { type: "mc", question: "Which number comes after five?", answer: "six", options: ["six", "four", "nine"] },
  { type: "tf", sentence: "The song counts to ten.", answer: false },
  { type: "mc", question: "What is the first number?", answer: "one", options: ["one", "seven", "three"] },
];
const shoes: ReadingItem[] = [
  { type: "tf", sentence: "The song is about clothes.", answer: true },
  { type: "mc", question: "What do they put on?", answer: "shoes", options: ["shoes", "glasses", "a dress"] },
  {
    type: "mc",
    question: "Where are they going?",
    answer: "outside",
    options: ["outside", "to bed", "to the zoo"],
  },
  { type: "tf", sentence: "They put on a jacket.", answer: true },
];
const bus: ReadingItem[] = [
  { type: "tf", sentence: "The song is about a bus.", answer: true },
  {
    type: "mc",
    question: "The wheels on the bus go…",
    answer: "round and round",
    options: ["round and round", "up and down", "fast and slow"],
  },
  {
    type: "mc",
    question: "The horn on the bus goes…",
    answer: "beep beep beep",
    options: ["beep beep beep", "moo moo moo", "quack quack quack"],
  },
  { type: "tf", sentence: "The bus goes all through the town.", answer: true },
];
const farm: ReadingItem[] = [
  { type: "tf", sentence: "Old MacDonald has a farm.", answer: true },
  { type: "mc", question: "What does the cow say?", answer: "moo", options: ["moo", "woof", "meow"] },
  { type: "tf", sentence: "The song says “E-I-E-I-O”.", answer: true },
  {
    type: "mc",
    question: "Where do the animals live?",
    answer: "on a farm",
    options: ["on a farm", "in a shop", "in a school"],
  },
];

const WATCH = { en: "Watch and answer", vi: "Xem video và trả lời" };

export const VIDEOS: VideoActivity[] = [
  // Starters
  { level: "STARTERS", topic: "colours", ...WATCH, videoId: "jYAWf8Y91hA", items: blue },
  { level: "STARTERS", topic: "animals", ...WATCH, videoId: "GoSq-yZcJ-4", items: jungle },
  {
    level: "STARTERS",
    topic: "animals",
    en: "Watch: the farm",
    vi: "Xem video: trang trại",
    videoId: "_6HzoUcx3eo",
    items: farm,
  },
  { level: "STARTERS", topic: "body", ...WATCH, videoId: "WX8HmogNyCY", items: body },
  { level: "STARTERS", topic: "food", ...WATCH, videoId: "frN3nvhIHUk", items: broccoli },
  { level: "STARTERS", topic: "numbers", ...WATCH, videoId: "pTLtcno5_cY", items: seven },
  { level: "STARTERS", topic: "clothes", ...WATCH, videoId: "_QuR8ifY0Z4", items: shoes },
  { level: "STARTERS", topic: "transport", ...WATCH, videoId: "9UasekNr8KI", items: bus },
  // Global Success 1
  { level: "GS1", topic: "unit-10", ...WATCH, videoId: "GoSq-yZcJ-4", items: jungle },
  { level: "GS1", topic: "unit-11", ...WATCH, videoId: "9UasekNr8KI", items: bus },
  { level: "GS1", topic: "unit-13", ...WATCH, videoId: "frN3nvhIHUk", items: broccoli },
  { level: "GS1", topic: "unit-15", ...WATCH, videoId: "WX8HmogNyCY", items: body },
  {
    level: "GS1",
    topic: "unit-06",
    en: "Watch and count",
    vi: "Xem video và đếm số",
    videoId: "pTLtcno5_cY",
    items: seven,
  },
];
