# TODO

## inline-function-suggestion rule

autofixable

takes the context of the function, and places in in place of function call context.

should handle autorenaming inner arguments according to the parameters in call place.

should understand the call contexts - condition vs function body, etc.

In condition it is only possible to replace functions with single expression in the function body.

if possible to correctly transform if/else to ternary, do it.
