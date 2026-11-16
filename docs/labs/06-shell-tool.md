# Lab 6: a shell tool, safely

The question box takes the command an agent wants to run. Four rules decide if it starts. The agent works in one folder called sandbox, which holds two small files.

## The problem

A shell can delete files or read secrets. An agent that can type anything can do anything.

## New words

shell = a program that runs commands. allow-list = the only commands we permit. sandbox = a folder it cannot leave.

## Run it

```bash
bun run lab 6          # a menu: pick an example
bun run lab 6 --demo   # every case, each with its reason
bun run lab 6 --naive  # the same menu, the naive way (case 1)
```

## The cases

Case 1 is the naive way. Read what goes wrong, then read the rest.

| # | Case | Why it matters | Result | Run it alone |
| --- | --- | --- | --- | --- |
| 1 | NAIVE: hand it to a shell | The agent asks for ls .. and the shell obeys. It lists the folder ABOVE the sandbox. The same hole would let it read or delete there. | `escaped` | `bun run lab 6 --question "ls .." --naive` |
| 2 | List the folder | A harmless command on the allow-list. It runs. | `ran` | `bun run lab 6 --question "ls"` |
| 3 | Read a file | Reading a file inside the sandbox is fine. | `ran` | `bun run lab 6 --question "cat doses.txt"` |
| 4 | A command not on the list | rm can delete. It is not on the allow-list, so it is refused before anything starts. | `refused` | `bun run lab 6 --question "rm notes.txt"` |
| 5 | Chaining a second command | The first part is allowed. The semicolon would add a delete. We refuse the whole line. | `refused` | `bun run lab 6 --question "cat notes.txt; rm notes.txt"` |
| 6 | Climbing out of the folder | Two dots mean the folder above. The sandbox is only a rule if code enforces it. | `refused` | `bun run lab 6 --question "cat ../package.json"` |
| 7 | An absolute path | A path from the top of the disk could read any file. It is refused. | `refused` | `bun run lab 6 --question "cat /etc/hosts"` |
| 8 | A file that is not there | The command is allowed, but it fails. The error goes back to the agent, so it can try again. That is lab 16. | `failed` | `bun run lab 6 --question "cat missing.txt"` |
| 9 | A command that never ends | Sleep for 5 seconds with a limit of 1. The time limit stops it. Without one, a stuck command would hang the agent. | `timeout` | `bun run lab 6 --question "sleep 5" --limit 1` |

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
