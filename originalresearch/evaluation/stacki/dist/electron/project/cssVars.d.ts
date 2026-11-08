interface SetValuePayload {
    readonly file: string;
    readonly valueStart: number;
    readonly valueEnd: number;
    readonly expect?: string;
    readonly value: string;
}
/**
 * Replaces one variable's value in place. The value it is replacing has to be
 * the value that was read, or the file has changed underneath the panel and the
 * offsets no longer mean anything.
 */
declare function setVariable(projectPath: string, { file, valueStart, valueEnd, expect, value }: SetValuePayload): {
    ok: boolean;
    stale?: boolean;
    error?: string;
};
interface SectionRangePayload {
    readonly file: string;
    readonly start: number;
    readonly end: number;
    readonly expect?: string;
    readonly title?: string;
}
/**
 * Renames a heading that is a comment.
 *
 * A file with one rule takes its headings from the comments in it, so the
 * heading is not a property of anything — it is those words, and renaming it is
 * writing them. Like a value, it is written back only if the file still says
 * what the panel read.
 */
declare function setSectionTitle(projectPath: string, { file, start, end, expect, title }: SectionRangePayload): {
    ok: boolean;
    stale?: boolean;
    error?: string;
};
/**
 * Removes a heading that is a comment.
 *
 * The variables under it do not go anywhere — they join the section above,
 * which is what a heading meant in the first place: a line drawn between two
 * runs of declarations. Rubbing the line out leaves both runs.
 *
 * Takes the same range as a rename (where the WORDS are) and grows outwards to
 * the `/*` and `*\/` around them, then to the whole line when the comment has
 * one to itself — a heading removed by cutting the words alone would leave an
 * empty comment behind.
 */
declare function removeSection(projectPath: string, { file, start, end, expect }: SectionRangePayload): {
    ok: boolean;
    stale?: boolean;
    error?: string;
};
interface MoveHeadingPayload {
    readonly file: string;
    readonly selector: string;
    readonly start: number;
    readonly end: number;
    readonly expect?: string;
    readonly before?: string;
}
/**
 * Moves a heading, and only the heading.
 *
 * The variables do not travel with it, because they were never inside it: a
 * group is the run of lines between one comment and the next, so dragging a
 * comment up past three variables is how those three variables come to be under
 * it. Moving the run wholesale is a different gesture (moveSection) and a
 * different intent.
 *
 * `before` is the declaration it should sit above; null puts it after the last
 * one, where it heads whatever is added next.
 */
declare function moveHeading(projectPath: string, { file, selector, start, end, expect, before }: MoveHeadingPayload): {
    ok: boolean;
    stale?: boolean;
    error?: string;
};
interface AddSectionPayload {
    readonly file: string;
    readonly selector: string;
    readonly title?: string;
    readonly before?: string;
    readonly at?: number;
}
/**
 * Writes another heading into the rule.
 *
 * A heading is a line between declarations, so a second one is how a run of
 * variables becomes two runs — and an empty one, written directly above another
 * heading, is a group waiting to be filled.
 *
 * `at` puts it on the line holding that offset (above an existing heading);
 * `before` puts it above a named declaration. Either way it takes the
 * indentation of the line it lands on.
 */
declare function addSection(projectPath: string, { file, selector, title, before, at }: AddSectionPayload): {
    ok: boolean;
    error?: string;
    stale?: boolean;
    title?: string;
};
interface MoveVariablePayload {
    readonly file: string;
    readonly selector: string;
    readonly name: string;
    readonly target?: string;
    readonly at?: number;
}
/**
 * Moves one declaration to sit before another inside the same rule. The panel
 * reorders rows; the file is what actually holds the order, so a row that moves
 * moves the line — indentation, trailing comment and all — rather than being
 * rewritten somewhere else.
 *
 * `target` is the name to land in front of; null means the end of the rule.
 */
declare function moveVariable(projectPath: string, { file, selector, name, target, at: landAt }: MoveVariablePayload): {
    ok: boolean;
    error?: string;
    changed?: boolean;
};
interface MoveSectionPayload {
    readonly file: string;
    readonly selector: string;
    readonly names: readonly string[];
    readonly target?: string;
}
/**
 * Moves a whole group — the comment that heads it and every declaration under
 * it — to sit in front of another group's first declaration, or to the end of
 * the rule. Same idea as moving one row, except that a group is several lines
 * that are not always next to each other (a family's names interleave), so they
 * are cut out and re-inserted together, in the order they were in.
 */
declare function moveSection(projectPath: string, { file, selector, names, target }: MoveSectionPayload): {
    ok: boolean;
    error?: string;
    changed?: boolean;
};
interface AddVariablePayload {
    readonly file: string;
    readonly selector: string;
    readonly name: string;
    readonly value?: string;
    readonly after?: string;
}
/**
 * Adds a declaration to a rule, under the group it belongs to. `after` is the
 * name it should follow — the last variable of that group — so a new one lands
 * at the bottom of its own group rather than at the bottom of the rule, which
 * for a file like this would be two hundred lines away from what it belongs to.
 */
declare function addVariable(projectPath: string, { file, selector, name, value, after }: AddVariablePayload): {
    ok: boolean;
    error?: string;
    name?: string;
};
export { setSectionTitle, removeSection, addSection, moveHeading, setVariable, moveVariable, moveSection, addVariable };
export { readDeclarations, findStylesheets } from './cssVarRead';
export { findFamilies, groupRules, labelForRule } from './cssVarGroups';
export { readVariables } from './cssVarModel';
export { renameVariables } from './cssVarRename';
