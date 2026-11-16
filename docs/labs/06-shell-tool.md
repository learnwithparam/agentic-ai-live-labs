# Lab 6: a shell tool, safely

The question box takes the command an agent wants to run. Four rules decide if it starts. The agent works in one folder called sandbox, which holds two small files.

## The problem

A shell can delete files or read secrets. An agent that can type anything can do anything.

## New words

shell = a program that runs commands. allow-list = the only commands we permit. sandbox = a folder it cannot leave.

## Run it

Copy any line into your terminal. Each one is a real example from this lab.

```bash
bun labs/06-shell-tool.ts --question "ls .." --naive
bun labs/06-shell-tool.ts --question "ls"
bun labs/06-shell-tool.ts --question "cat doses.txt"
bun labs/06-shell-tool.ts --question "rm notes.txt"
bun labs/06-shell-tool.ts --question "cat notes.txt; rm notes.txt"
bun labs/06-shell-tool.ts --question "cat ../package.json"
bun labs/06-shell-tool.ts --question "cat /etc/hosts"
bun labs/06-shell-tool.ts --question "cat missing.txt"
bun labs/06-shell-tool.ts --question "sleep 5" --limit 1
bun labs/06-shell-tool.ts --demo
```

Run `bun labs/06-shell-tool.ts` with nothing else to pick an example from a menu.

## The cases

Case 1 is the naive way. Read what goes wrong, then read the rest.

| # | Case | Why it matters | Result | Run it alone |
| --- | --- | --- | --- | --- |
| 1 | NAIVE: hand it to a shell | The agent asks for ls .. and the shell obeys. It lists the folder ABOVE the sandbox. The same hole would let it read or delete there. | escaped | `bun labs/06-shell-tool.ts --question "ls .." --naive` |
| 2 | List the folder | A harmless command on the allow-list. It runs. | ran | `bun labs/06-shell-tool.ts --question "ls"` |
| 3 | Read a file | Reading a file inside the sandbox is fine. | ran | `bun labs/06-shell-tool.ts --question "cat doses.txt"` |
| 4 | A command not on the list | rm can delete. It is not on the allow-list, so it is refused before anything starts. | refused | `bun labs/06-shell-tool.ts --question "rm notes.txt"` |
| 5 | Chaining a second command | The first part is allowed. The semicolon would add a delete. We refuse the whole line. | refused | `bun labs/06-shell-tool.ts --question "cat notes.txt; rm notes.txt"` |
| 6 | Climbing out of the folder | Two dots mean the folder above. The sandbox is only a rule if code enforces it. | refused | `bun labs/06-shell-tool.ts --question "cat ../package.json"` |
| 7 | An absolute path | A path from the top of the disk could read any file. It is refused. | refused | `bun labs/06-shell-tool.ts --question "cat /etc/hosts"` |
| 8 | A file that is not there | The command is allowed, but it fails. The error goes back to the agent, so it can try again. That is lab 16. | failed | `bun labs/06-shell-tool.ts --question "cat missing.txt"` |
| 9 | A command that never ends | Sleep for 5 seconds with a limit of 1. The time limit stops it. Without one, a stuck command would hang the agent. | timeout | `bun labs/06-shell-tool.ts --question "sleep 5" --limit 1` |

## The promise, and its test

A command that breaks a rule never starts, so the files stay as they were.

```bash
bun test tests/promises/06.test.ts
```

To see the test do its job, break the rule in PART 1 on purpose. The test must fail. Then undo it.

## In production

Run the agent in a container with no secrets and no network, and keep this allow-list as well.

## Read the code

Open `labs/06-shell-tool.ts`. Read PART 1 only. It is the whole idea.
PART 2 only draws the colours, so skip it.
