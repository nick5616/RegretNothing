// Family titles people sign with: "Aunt Jo" should be thanked as "Aunt Jo", not "Aunt".
const TITLES = /^(aunt|auntie|aunty|uncle|grandma|grandpa|granny|gran|gramps|grammy|nana|nanna|papa|pop|pops|mom|mum|dad|cousin|nonna|nonno|abuela|abuelo|tia|tio|oma|opa|bubbe|zayde|great|mr|mrs|ms|dr)\.?$/i;

/** How to greet someone by the name they typed: their first name, or the whole thing when it starts with a title. */
export function greetName(name: string): string {
  const words = name.trim().split(/\s+/);
  return words.length > 1 && TITLES.test(words[0]) ? words.join(" ") : words[0];
}
