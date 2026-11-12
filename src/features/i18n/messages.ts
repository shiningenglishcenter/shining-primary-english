/**
 * Student-area interface language (D30): English (default) or Vietnamese.
 * Only the interface changes; learning content stays in English. Staff and
 * admin screens stay Vietnamese. The choice lives in a cookie so pages
 * render in it on the server.
 */
export const LANGS = ["en", "vi"] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = "en";
export const LANG_COOKIE = "shining-lang";

export function langOf(value: string | undefined | null): Lang {
  return value === "vi" ? "vi" : DEFAULT_LANG;
}

const vi = {
  // shell
  home: "Về trang chủ",
  signOut: "Thoát",
  loading: "Đang tải",
  langLabel: "Ngôn ngữ",
  greeting: "Sunny chào con!",
  hello: (name: string) => `Hello, ${name}!`,
  choosePrograme: "Chọn chương trình",
  chooseLevel: "Chọn trình độ",
  topicsOf: (noun: "topic" | "unit", level: string) => `${noun === "unit" ? "Unit" : "Chủ đề"} ${level}`,
  doneOf: (done: number, total: number) => `${done}/${total} bài đã làm`,
  activitiesOf: (done: number, total: number) => `${done}/${total} bài`,
  comingSoon: (level: string) => `Bài luyện ${level} sắp có!`,
  comingSoonHint: "Thầy cô đang chuẩn bị bài. Trong lúc chờ, con luyện",
  comingSoonOr: "hoặc",
  back: "Quay lại",
  activitiesCount: (n: number) => `${n} bài luyện`,
  noActivities: "Chủ đề này chưa có bài luyện.",
  activityN: (n: number) => `Bài ${n}`,
  play: "Chơi",
  // player shell
  noQuestions: "Bài này chưa có câu hỏi.",
  backToTopic: "Quay lại chủ đề",
  exit: "Thoát bài",
  progress: "Tiến độ",
  soundOn: "Bật âm thanh",
  soundOff: "Tắt âm thanh",
  // feedback
  great: "Giỏi quá!",
  correct: "Đúng rồi!",
  tryAgain: "Chưa đúng rồi! Thử lại nhé.",
  orderTryAgain: "Chưa đúng thứ tự. Thử lại nhé!",
  failed: "Không sao, mình học tiếp nhé!",
  rightAnswer: "Đáp án đúng:",
  triesLeft: (n: number) => `Còn ${n} lần thử`,
  hint: "Gợi ý",
  seeResults: "Xem kết quả",
  nextQuestion: "Câu tiếp theo",
  check: "Kiểm tra",
  // per game
  flashDone: "Xong rồi!",
  flashNext: "Thẻ tiếp theo",
  listenWord: (w: string) => `Nghe từ ${w}`,
  listenAgain: "Nghe lại",
  listenSentence: "Nghe câu",
  listenQuestion: "Nghe câu hỏi",
  readAloud: "Đọc to bài",
  wordMeans: (w: string, vi: string): string | undefined => `“${w}” là ${vi}`,
  picture: (vi: string, n: number) => `Hình ${n}: ${vi}`,
  letter: (l: string) => `Chữ ${l}`,
  deleteLetter: "Xoá chữ vừa chọn",
  restart: "Xếp lại từ đầu",
  tapWords: "Chạm các từ bên dưới",
  writeWord: "Viết từ con nghe được",
  tapPictureToHear: "Chạm vào hình để nghe tên của nó.",
  tfRight: (yes: boolean, ctx: boolean): string =>
    ctx
      ? yes
        ? "Câu này đúng theo bài."
        : "Câu này không đúng theo bài."
      : yes
        ? "Câu này đúng với hình."
        : "Câu này không đúng với hình.",
  // automatic hints
  hintListenChoose: "Bấm loa nghe lại thật kỹ. Một hình sai đã được bỏ đi.",
  hintStartsWith: (l: string) => `Từ này bắt đầu bằng chữ “${l}”.`,
  hintStartsLength: (l: string, n: number) => `Từ bắt đầu bằng chữ “${l}” và có ${n} chữ cái.`,
  hintTf: (ctx: "listening" | "reading" | undefined): string =>
    ctx === "listening"
      ? "Nghe lại bài thật kỹ nhé."
      : ctx === "reading"
        ? "Đọc lại bài thật kỹ nhé."
        : "Nhìn kỹ hình và nghe lại câu nhé.",
  hintFill: "Đọc lại cả câu nhé. Một đáp án sai đã được bỏ đi.",
  hintOrder: (w: string) => `Câu bắt đầu bằng “${w}”.`,
  hintChoice: (ctx: "listening" | "reading" | undefined): string =>
    ctx === "listening"
      ? "Nghe lại đoạn có câu trả lời nhé. Một đáp án sai đã được bỏ đi."
      : "Đọc lại bài nhé. Một đáp án sai đã được bỏ đi.",
  // context panel
  listenTitle: "Nghe bài",
  readTitle: "Đọc bài",
  hide: (listening: boolean): string => (listening ? "Ẩn bài nghe" : "Ẩn bài đọc"),
  show: (listening: boolean): string => (listening ? "Mở bài nghe" : "Mở bài đọc"),
  videoTitle: "Video bài nghe",
  noAudio: "Trình duyệt không phát được audio.",
  mediaMissing: "Không mở được bài nghe. Hỏi thầy cô nhé.",
  // finish
  cheer: (stars: number): string =>
    stars === 3 ? "Xuất sắc!" : stars === 2 ? "Giỏi lắm!" : stars === 1 ? "Cố lên nào!" : "Mình thử lại nhé!",
  flashSeen: (n: number) => `Con đã xem ${n} thẻ từ`,
  score: (s: number, m: number) => `Điểm: ${s}/${m}`,
  nextActivity: "Bài tiếp theo",
  playAgain: "Chơi lại",
  aboutTopic: "Về chủ đề",
  starsOf: (n: number) => `${n} trên 3 sao`,
  saving: "Đang lưu…",
  saveFailed: "Chưa lưu được kết quả.",
};
export type Messages = typeof vi;

const en: Messages = {
  home: "Home",
  signOut: "Log out",
  loading: "Loading",
  langLabel: "Language",
  greeting: "Hi from Sunny!",
  hello: (name) => `Hello, ${name}!`,
  choosePrograme: "Choose a course",
  chooseLevel: "Choose a level",
  topicsOf: (noun, level) => `${level} ${noun === "unit" ? "units" : "topics"}`,
  doneOf: (done, total) => `${done}/${total} done`,
  activitiesOf: (done, total) => `${done}/${total}`,
  comingSoon: (level) => `${level} is coming soon!`,
  comingSoonHint: "Your teachers are getting it ready. Meanwhile, try",
  comingSoonOr: "or",
  back: "Back",
  activitiesCount: (n) => `${n} ${n === 1 ? "activity" : "activities"}`,
  noActivities: "No activities here yet.",
  activityN: (n) => `Activity ${n}`,
  play: "Play",
  noQuestions: "This activity has no questions yet.",
  backToTopic: "Back to the topic",
  exit: "Leave",
  progress: "Progress",
  soundOn: "Sound on",
  soundOff: "Sound off",
  great: "Great job!",
  correct: "That's right!",
  tryAgain: "Not quite! Try again.",
  orderTryAgain: "Not in the right order. Try again!",
  failed: "That's OK, let's keep going!",
  rightAnswer: "The answer is:",
  triesLeft: (n) => `${n} ${n === 1 ? "try" : "tries"} left`,
  hint: "Hint",
  seeResults: "See my score",
  nextQuestion: "Next",
  check: "Check",
  flashDone: "Done!",
  flashNext: "Next card",
  listenWord: (w) => `Listen: ${w}`,
  listenAgain: "Listen again",
  listenSentence: "Listen to the sentence",
  listenQuestion: "Listen to the question",
  readAloud: "Read it aloud",
  wordMeans: () => undefined,
  picture: (_vi, n) => `Picture ${n}`,
  letter: (l) => `Letter ${l}`,
  deleteLetter: "Delete the last letter",
  restart: "Start again",
  tapWords: "Tap the words below",
  writeWord: "Write the word you hear",
  tapPictureToHear: "Tap a picture to hear its name.",
  tfRight: (yes, ctx) =>
    ctx
      ? yes
        ? "Yes, that's in the text."
        : "No, that's not what it says."
      : yes
        ? "Yes, it matches the picture."
        : "No, it doesn't match the picture.",
  hintListenChoose: "Listen carefully again. One wrong picture is gone.",
  hintStartsWith: (l) => `The word starts with “${l}”.`,
  hintStartsLength: (l, n) => `It starts with “${l}” and has ${n} letters.`,
  hintTf: (ctx) =>
    ctx === "listening"
      ? "Listen again carefully."
      : ctx === "reading"
        ? "Read the text again carefully."
        : "Look at the picture and listen again.",
  hintFill: "Read the whole sentence again. One wrong answer is gone.",
  hintOrder: (w) => `The sentence starts with “${w}”.`,
  hintChoice: (ctx) =>
    ctx === "listening"
      ? "Listen to that part again. One wrong answer is gone."
      : "Read the text again. One wrong answer is gone.",
  listenTitle: "Listen",
  readTitle: "Read",
  hide: () => "Hide",
  show: () => "Show",
  videoTitle: "Listening video",
  noAudio: "This browser cannot play the audio.",
  mediaMissing: "The listening can't be opened. Ask your teacher.",
  cheer: (stars) =>
    stars === 3
      ? "Excellent!"
      : stars === 2
        ? "Well done!"
        : stars === 1
          ? "Keep going!"
          : "Let's try again!",
  flashSeen: (n) => `You looked at ${n} cards`,
  score: (s, m) => `Score: ${s}/${m}`,
  nextActivity: "Next activity",
  playAgain: "Play again",
  aboutTopic: "Back to the topic",
  starsOf: (n) => `${n} out of 3 stars`,
  saving: "Saving…",
  saveFailed: "Couldn't save your score.",
};

export const MESSAGES: Record<Lang, Messages> = { en, vi };
