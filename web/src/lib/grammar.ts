/**
 * Present-tense agreement helper mirroring the CLI's `conjugate`: "You"
 * (second person) takes the bare verb ("You call", "You lose", "You win"),
 * while a named bot (third person singular) takes the "-s" form ("Duke
 * calls", "Cora loses", "Duke wins"). Every verb this app uses is a regular
 * "+s" verb, so this stays deliberately simple.
 */
export function conjugate(isHuman: boolean, base: string): string {
  return isHuman ? base : `${base}s`;
}
