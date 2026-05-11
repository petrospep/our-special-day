export const INVITE_CODE_PREFIXES = [
  "bon-bon-baby",
  "rose-petal-prince",
  "church-bell-chime",
  "bow-tie-bolero",
  "satin-shoe",
  "twinkle-lights",
  "fairy-lights",
  "sparkly-sparkles",
  "daisy-chain",
  "peachy-pebble",
  "say-cheesecake",
  "keylime-pie",
  "sherbet-daisy",
  "magnolia-magic",
  "strawberry-fudge",
  "mango-skies",
  "orange-jam",
  "almond-antics",
  "jellycat-joy",
  "jumping-juniper",
  "defiant-daisy",
  "portokalopita-puppy",
  "chocolate-chip",
  "atomic-muffin",
  "profiterole-mountain",
  "polo-chopstick",
  "strawberry-laces",
  "sherbet-lemon",
  "frothy-frappe",
  "fluffy-puppy",
  "strawberry-fields",
  "cherry-berry",
  "sunny-sandwich",
  "atomic-berry",
  "totally-toblerone",
  "meringue-mountain",
  "marshmallow-moo",
  "fluffy-muffin",
  "squidy-icing",
  "totally-turtle",
  "twinkle-star",
  "pink-poodle",
  "fluffy-goose",
  "smiling-duck",
  "twinkly-tree",
  "buttercup-tree",
  "peanut-butter-cup",
  "sandy-pebble",
] as const;

export const INVITE_CODE_SUFFIX_CHARS = "abcdefghijkmnpqrstuvwxyz23456789";
export const INVITE_CODE_SUFFIX_LENGTH = 10;

export const legacyInviteCodePattern = /^w-[a-z0-9]{8,16}$/;

export const themedInviteCodePattern = new RegExp(
  `^(?:${INVITE_CODE_PREFIXES.map((prefix) => prefix.toLowerCase()).join("|")})-[${INVITE_CODE_SUFFIX_CHARS}]{${INVITE_CODE_SUFFIX_LENGTH}}$`,
);

export function isValidInviteCode(value: string) {
  const normalizedValue = value.toLowerCase();

  return (
    legacyInviteCodePattern.test(normalizedValue) || themedInviteCodePattern.test(normalizedValue)
  );
}
