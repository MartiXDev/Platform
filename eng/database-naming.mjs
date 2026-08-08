function isLowercase(character) {
  return character !== undefined && character >= "a" && character <= "z";
}

function isUppercase(character) {
  return character !== undefined && character >= "A" && character <= "Z";
}

function isDigit(character) {
  return character !== undefined && character >= "0" && character <= "9";
}

export function toDatabaseIdentifier(value) {
  const result = [];

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === "_") {
      result.push(character);
      continue;
    }

    const previous = value[index - 1];
    const next = value[index + 1];
    const startsWord =
      isUppercase(character) &&
      index > 0 &&
      (isLowercase(previous) ||
        isDigit(previous) ||
        (isUppercase(previous) && isLowercase(next)));
    if (startsWord && result.length > 0 && result.at(-1) !== "_") {
      result.push("_");
    }

    result.push(character.toLowerCase());
  }

  return result.join("");
}
