# Gherkin tables

```gherkin
Feature: Todo List

Scenario: Adding an item to my todo list
  Given my todo list currently looks as follows:
  | TaskName            | Priority |
  | Fix bugs in my code | medium   |
  | Document my hours   | medium   |
  When I add the following task:
  | TaskName                              | Priority |
  | Watch cat videos on YouTube all day   | high     |
  Then I should see the following todo list:
  | TaskName                              | Priority |  
  | Watch cat videos on YouTube all day   | high     |
  | Sign up for unemployment              | high     |
```

```javascript
import { defineFeature, loadFeature } from 'jest-cucumber';
import TodoList from '../TodoList';

const feature = loadFeature('./features/TodoList.feature');

defineFeature(feature, test => {
  let todoList;
		
  beforeEach(() => {
    todoList = new TodoList();
  });

  test('Adding an item to my todo list', ({ given, when, then }) => {
    given('my todo list currently looks as follows:', table => {
      table.forEach(row => {
        todoList.add({
	  name: row.TaskName,
	  priority: row.Priority
	});
      });
    });

    when('I add the following task:', table => {
      todoList.add({
        name: table[0].TaskName,
	priority: table[0].Priority
      });
    });

    then('I should see the following todo list:', table => {
      expect(todoList.items.length).toBe(table.length);
    
      table.forEach((row, index) => {
        expect(todoList.items[index].name).toBe(table[index].TaskName);
	expect(todoList.items[index].priority).toBe(table[index].Priority);
      });
    });
  });
});
```

## Multiline cells

A cell holding a JSON array or a long composite identifier pushes its row well past any readable
line width. Such a row can be spread over several lines, in either of two notations.

**Separator rows** — logical rows are delimited by a line whose cells contain only dashes, like a
Markdown table:

```gherkin
  Given there are the following available disciplines
  | type  | enrollment | schedule_segments        |
  |-------|------------|--------------------------|
  | major | LSpS 1     | [                        |
  |       | LSpS       |   {"key": "semester_1"}, |
  |       | Bordeaux   |   {"key": "semester_2"}  |
  |       |            | ]                        |
  |-------|------------|--------------------------|
  | minor | Terminale  | []                       |
```

**A trailing `+`** — a `+` after a row's closing pipe means the lines below it continue that row,
up to the next line whose first cell is filled:

```gherkin
  Given there are the following available disciplines
  | type  | enrollment | schedule_segments        |
  | major | LSpS 1     | [                        |+
  |       | LSpS       |   {"key": "semester_1"}, |
  |       | Bordeaux   |   {"key": "semester_2"}  |
  |       |            | ]                        |
  | minor | Terminale  | []                       |
```

Both give the step definition the same two rows:

```javascript
[
  {
    type: 'major',
    enrollment: 'LSpS 1\nLSpS\nBordeaux',
    schedule_segments: '[\n  {"key": "semester_1"},\n  {"key": "semester_2"}\n]',
  },
  { type: 'minor', enrollment: 'Terminale', schedule_segments: '[]' },
];
```

Things worth knowing:

- **A table using neither notation is untouched**, so nothing changes for tables you already have.
  The one exception is a table that already contained a row of nothing but dashes, which now reads
  as a separator instead of as data.
- **A cell is its fragments joined by newlines**, with the column's own padding stripped and any
  indentation beyond it kept — which is what lets a pretty-printed JSON cell survive as valid JSON.
- **Blank fragments at either end of a cell are dropped**, so a cell that only carries a value on
  the row's first line reads exactly as it would in a single-line table. A blank fragment between
  two filled ones is kept, as an empty line.
- **With the trailing `+`, a continuation line is one whose first cell is empty.** A logical row
  therefore needs a filled first cell. Use the separator notation when that does not hold.
- **The two notations cannot be mixed in one table**, and an ambiguous table fails with the line
  number at fault rather than being guessed at.
- **Line numbers are preserved**, so validation and error messages still point at the right line.
