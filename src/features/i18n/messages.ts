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
  greeting: "Shining chào con!",
  hello: (name: string) => `Hello, ${name}!`,
  choosePrograme: "Chọn chương trình",
  chooseLevel: "Chọn trình độ",
  topicsOf: (noun: "topic" | "unit", level: string) => `${noun === "unit" ? "Unit" : "Chủ đề"} ${level}`,
  doneOf: (done: number, total: number) => `${done}/${total} bài đã làm`,
  activitiesOf: (done: number, total: number) => `${done}/${total} bài`,
  comingSoon: (level: string) => `Bài luyện ${level} sắp có!`,
  missedTitle: "Ôn lại từ hay sai",
  missedCard: (n: number) => `Ôn lại ${n} từ con hay sai`,
  missedCardHint: "Không tính sao, ôn cho nhớ nhé!",
  missedNone: "Tuần này con không sai từ nào. Giỏi lắm!",
  backHome: "Về trang chủ",
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
  flipCard: "Chạm để lật thẻ",
  letterHint: "Gợi ý chữ cái",
  patternsTitle: "Mẫu câu",
  showMeaning: "Xem nghĩa",
  hideMeaning: "Ẩn nghĩa",
  watchFirst: "Xem/nghe hết bài trước nhé! 👀",
  watchUntil: (s: number) =>
    `Xem/nghe đến phút ${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")} nhé! 👀`,
  watchedIt: "Con xem xong rồi ✓",
  flipBack: "Lật lại",
  soundTip: "Bật tiếng để nghe nhé! 🔊",
  soundTipIos: "Không nghe thấy? Gạt nút im lặng của máy và tăng âm lượng nhé! 🔊",
  closeTip: "Đóng",
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
  writeAnswer: "Viết câu trả lời",
  hintWrite: (l: string, n: number) => `Câu trả lời bắt đầu bằng “${l}” và có ${n} chữ cái.`,
  pickThing: "Chạm vào hình được nhắc tới",
  pickColour: "Chọn màu",
  hintColour: "Nghe lại thật kỹ: hình nào, màu gì?",
  colourRight: (thing: string) => `Đúng rồi! Tô ${thing}.`,
  hearWords: "Nghe các từ",
  phonicsAsk: (sound: string) => `Từ nào có âm ${sound}?`,
  hintPhonics: "Chạm loa nghe lại từng từ, chú ý âm đó. Một đáp án sai đã được bỏ đi.",
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
  filterLabel: "Xem bài:",
  filterAll: "Tất cả",
  filterTodo: "Chưa làm",
  filterDone: "Đã làm",
  filterEmpty: "Không có bài nào ở mục này.",
  reviewTitle: "Xem lại câu chưa đúng",
  reviewMore: (n: number) => `và ${n} câu nữa`,
  retryMistakes: (n: number) => `Luyện lại câu sai (${n})`,
  retryDone: (fixed: number, total: number) =>
    fixed === total ? `Con đã sửa được cả ${total} câu! 🎉` : `Con đã sửa được ${fixed}/${total} câu!`,
  retryNoStars: "Lượt luyện lại không đổi số sao của bài.",
  playFullAgain: "Làm lại cả bài",
  aboutTopic: "Về chủ đề",
  starsOf: (n: number) => `${n} trên 3 sao`,
  saving: "Đang lưu…",
  saveFailed: "Chưa lưu được kết quả.",
  // guest links (D35)
  loginToSave: "Đăng nhập để lưu điểm",
  guestAsk: "Con tên là gì?",
  guestHint: "Nhập tên gọi của con để thầy cô biết ai đã làm bài.",
  guestPlaceholder: "Ví dụ: Bin",
  guestStart: "Bắt đầu",
  guestNotYou: (name: string) => `Không phải ${name}? Đổi tên`,
  guestHello: (name: string) => `Chào ${name}!`,
  linkOff: "Link này không còn mở được",
  linkOffHint: "Có thể thầy cô đã tắt link hoặc gửi link mới. Hãy hỏi lại thầy cô nhé.",
  haveAccount: "Con có tài khoản? Đăng nhập",
};
export type Messages = typeof vi;

const en: Messages = {
  home: "Home",
  signOut: "Log out",
  loading: "Loading",
  langLabel: "Language",
  greeting: "Hi from Shining!",
  hello: (name) => `Hello, ${name}!`,
  choosePrograme: "Choose a course",
  chooseLevel: "Choose a level",
  topicsOf: (noun, level) => `${level} ${noun === "unit" ? "units" : "topics"}`,
  doneOf: (done, total) => `${done}/${total} done`,
  activitiesOf: (done, total) => `${done}/${total}`,
  comingSoon: (level) => `${level} is coming soon!`,
  missedTitle: "Words to practise again",
  missedCard: (n) => `Practise ${n} tricky words`,
  missedCardHint: "No stars, just practice!",
  missedNone: "No mistakes this week. Well done!",
  backHome: "Back home",
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
  flipCard: "Tap to flip",
  letterHint: "Letter hint",
  patternsTitle: "Sentence patterns",
  showMeaning: "Meaning",
  hideMeaning: "Hide meaning",
  watchFirst: "Watch or listen to the end first! 👀",
  watchUntil: (s) => `Watch or listen until ${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}! 👀`,
  watchedIt: "I've watched it ✓",
  flipBack: "Flip back",
  soundTip: "Turn the sound on to listen! 🔊",
  soundTipIos: "Can't hear? Switch off silent mode and turn the volume up! 🔊",
  closeTip: "Close",
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
  writeAnswer: "Write the answer",
  hintWrite: (l, n) => `The answer starts with “${l}” and has ${n} letters.`,
  pickThing: "Tap the thing you hear",
  pickColour: "Choose the colour",
  hintColour: "Listen again: which thing, which colour?",
  colourRight: (thing) => `Yes! Colour ${thing}.`,
  hearWords: "Hear the words",
  phonicsAsk: (sound) => `Which word has the sound ${sound}?`,
  hintPhonics: "Listen to each word again and find the sound. One wrong answer is gone.",
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
  filterLabel: "Show:",
  filterAll: "All",
  filterTodo: "Not done",
  filterDone: "Done",
  filterEmpty: "No activities here.",
  reviewTitle: "Let's look again",
  reviewMore: (n) => `and ${n} more`,
  retryMistakes: (n) => `Practise the mistakes (${n})`,
  retryDone: (fixed, total) =>
    fixed === total ? `You fixed all ${total}! 🎉` : `You fixed ${fixed} of ${total}!`,
  retryNoStars: "Practice rounds don't change your stars.",
  playFullAgain: "Play the whole game again",
  aboutTopic: "Back to the topic",
  starsOf: (n) => `${n} out of 3 stars`,
  saving: "Saving…",
  saveFailed: "Couldn't save your score.",
  loginToSave: "Log in to save your score",
  guestAsk: "What's your name?",
  guestHint: "Type your first name so your teacher knows who played.",
  guestPlaceholder: "e.g. Bin",
  guestStart: "Start",
  guestNotYou: (name) => `Not ${name}? Change name`,
  guestHello: (name) => `Hi, ${name}!`,
  linkOff: "This link is not available",
  linkOffHint: "Your teacher may have turned it off or sent a new one. Please ask them.",
  haveAccount: "Have an account? Log in",
};

export const MESSAGES: Record<Lang, Messages> = { en, vi };
