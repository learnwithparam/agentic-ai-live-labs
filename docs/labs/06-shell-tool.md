# Lab 6: a shell tool, safely

Describe a task and the model writes the command, or type the command yourself with --raw. Four rules decide if it starts. The agent works in one folder called sandbox, which holds two small files.

## The problem

A shell can delete files or read secrets. An agent that can type anything can do anything.

## New words

shell = a program that runs commands. allow-list = the only commands we permit. sandbox = a folder it cannot leave.

## Run it

Copy any line into your terminal. Each one is a real example from this lab.

```bash
bun labs/06-shell-tool.ts --question "Show me the doses file"
bun labs/06-shell-tool.ts --question "Delete the notes file"
bun labs/06-shell-tool.ts --question "ls .." --raw --naive
bun labs/06-shell-tool.ts --question "ls" --raw
bun labs/06-shell-tool.ts --question "cat doses.txt" --raw
bun labs/06-shell-tool.ts --question "rm notes.txt" --raw
bun labs/06-shell-tool.ts --question "cat notes.txt; rm notes.txt" --raw
bun labs/06-shell-tool.ts --question "cat ../package.json" --raw
bun labs/06-shell-tool.ts --question "cat /etc/hosts" --raw
bun labs/06-shell-tool.ts --question "cat missing.txt" --raw
bun labs/06-shell-tool.ts --question "sleep 5" --raw --limit 1
bun labs/06-shell-tool.ts --demo
```

Run `bun labs/06-shell-tool.ts` with nothing else to pick an example from a menu.

## The cases

| # | Case | Why it matters | Result | Run it alone |
| --- | --- | --- | --- | --- |
| 1 | The model writes the command | The model turns a plain task into a command. The four rules still decide if it starts. | ran | `bun labs/06-shell-tool.ts --question "Show me the doses file"` |
| 2 | The model asks to delete | The task asks for a delete. The model writes rm. It is not on the allow-list, so it never starts. | refused | `bun labs/06-shell-tool.ts --question "Delete the notes file"` |
| 3 | NAIVE: hand it to a shell | The agent asks for ls .. and the shell obeys. It lists the folder ABOVE the sandbox. The same hole would let it read or delete there. | escaped | `bun labs/06-shell-tool.ts --question "ls .." --raw --naive` |
| 4 | List the folder | A harmless command on the allow-list. It runs. | ran | `bun labs/06-shell-tool.ts --question "ls" --raw` |
| 5 | Read a file | Reading a file inside the sandbox is fine. | ran | `bun labs/06-shell-tool.ts --question "cat doses.txt" --raw` |
| 6 | A command not on the list | rm can delete. It is not on the allow-list, so it is refused before anything starts. | refused | `bun labs/06-shell-tool.ts --question "rm notes.txt" --raw` |
| 7 | Chaining a second command | The first part is allowed. The semicolon would add a delete. We refuse the whole line. | refused | `bun labs/06-shell-tool.ts --question "cat notes.txt; rm notes.txt" --raw` |
| 8 | Climbing out of the folder | Two dots mean the folder above. The sandbox is only a rule if code enforces it. | refused | `bun labs/06-shell-tool.ts --question "cat ../package.json" --raw` |
| 9 | An absolute path | A path from the top of the disk could read any file. It is refused. | refused | `bun labs/06-shell-tool.ts --question "cat /etc/hosts" --raw` |
| 10 | A file that is not there | The command is allowed, but it fails. The error goes back to the agent, so it can try again. That is lab 16. | failed | `bun labs/06-shell-tool.ts --question "cat missing.txt" --raw` |
| 11 | A command that never ends | Sleep for 5 seconds with a limit of 1. The time limit stops it. Without one, a stuck command would hang the agent. | timeout | `bun labs/06-shell-tool.ts --question "sleep 5" --raw --limit 1` |

## The promise, and its test

A command that breaks a rule never starts, so the files stay as they were.

```bash
bun test tests/promises/06.test.ts
```

To see the test do its job, break the rule in PART 1 on purpose. The test must fail. Then undo it.

## In production

Run the agent in a container with no secrets and no network, and keep this allow-list as well.

## Read the code

Open `labs/06-shell-tool.ts`. Read the code from the top. It holds only the lesson.
The screen output is in `show/`. You do not need it to learn.
