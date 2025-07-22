import { signal } from "@preact/signals-react";
import { type JSX } from "react";
import { useSignals } from "@preact/signals-react/runtime";

// This component should trigger ESLint warning for signal.value.map()
export function TestSignalValueMap(): JSX.Element {
	useSignals();
	const itemsSignal = signal(["apple", "banana", "cherry"]);

	// This should trigger a warning - using signal.value.map()
	return (
		<ul>
			{itemsSignal.value.map((item, index) => (
				<li key={index}>{item}</li>
			))}
		</ul>
	);
}

// This component should trigger warning for signal.value.map() with complex callback
export function TestSignalValueMapComplex(): JSX.Element {
	useSignals();
	const usersSignal = signal([
		{ id: 1, name: "John", age: 25 },
		{ id: 2, name: "Jane", age: 30 },
		{ id: 3, name: "Bob", age: 35 },
	]);

	// This should trigger a warning - complex callback with signal.value.map()
	return (
		<div>
			{usersSignal.value.map((user, index) => (
				<div key={user.id} className="user-card">
					<h3>{user.name}</h3>
					<p>Age: {user.age}</p>
					<p>Index: {index}</p>
				</div>
			))}
		</div>
	);
}

// This component should trigger warning for direct signal.map()
export function TestDirectSignalMap(): JSX.Element {
	useSignals();
	const numbersSignal = signal([1, 2, 3, 4, 5]);

	// This should trigger a warning - direct signal.map() usage
	return (
		<div>
			{numbersSignal.value.map((num, index) => (
				<span key={index}>{num * 2}</span>
			))}
		</div>
	);
}

// This component should trigger warning for signal.value.map() with arrow function
export function TestSignalMapArrowFunction(): JSX.Element {
	useSignals();
	const colorsSignal = signal(["red", "green", "blue"]);

	// This should trigger a warning - arrow function callback
	return (
		<div>
			{colorsSignal.value.map((color) => (
				<div key={color} style={{ backgroundColor: color }}>
					{color}
				</div>
			))}
		</div>
	);
}

// This component should trigger warning for signal.value.map() with function expression
export function TestSignalMapFunctionExpression(): JSX.Element {
	useSignals();
	const tasksSignal = signal([
		{ id: 1, title: "Task 1", completed: false },
		{ id: 2, title: "Task 2", completed: true },
	]);

	// This should trigger a warning - function expression callback
	return (
		<ul>
			{tasksSignal.value.map(function (task, index) {
				return (
					<li
						key={task.id}
						className={task.completed ? "completed" : "pending"}
					>
						{task.title} (#{index + 1})
					</li>
				);
			})}
		</ul>
	);
}

// This component should trigger warning for nested signal.value.map()
export function TestNestedSignalMap(): JSX.Element {
	useSignals();
	const categoriesSignal = signal([
		{ name: "Fruits", items: ["apple", "banana"] },
		{ name: "Vegetables", items: ["carrot", "broccoli"] },
	]);

	// This should trigger warnings - nested signal.value.map() calls
	return (
		<div>
			{categoriesSignal.value.map((category, catIndex) => (
				<div key={catIndex}>
					<h3>{category.name}</h3>
					<ul>
						{category.items.map((item, itemIndex) => (
							<li key={itemIndex}>{item}</li>
						))}
					</ul>
				</div>
			))}
		</div>
	);
}

// This component should trigger warning for signal.value.map() with index usage
export function TestSignalMapWithIndex(): JSX.Element {
	useSignals();
	const itemsSignal = signal(["first", "second", "third"]);

	// This should trigger a warning - map with index parameter
	return (
		<ol>
			{itemsSignal.value.map((item, index) => (
				<li key={index}>
					{index + 1}. {item}
				</li>
			))}
		</ol>
	);
}

// This component should NOT trigger warnings - regular array.map()
export function TestRegularArrayMap(): JSX.Element {
	useSignals();
	const regularArray = ["item1", "item2", "item3"];

	// This should NOT trigger a warning - regular array, not signal
	return (
		<ul>
			{regularArray.map((item, index) => (
				<li key={index}>{item}</li>
			))}
		</ul>
	);
}

// This component should NOT trigger warnings - signal used without .map()
export function TestSignalWithoutMap(): JSX.Element {
	useSignals();
	const itemsSignal = signal(["apple", "banana", "cherry"]);

	// This should NOT trigger a warning - signal used without .map()
	return (
		<div>
			<p>Items count: {itemsSignal.value.length}</p>
			<p>First item: {itemsSignal.value[0]}</p>
		</div>
	);
}

// Arrow function component with signal.value.map() - should trigger warning
export const TestArrowFunctionSignalMap = (): JSX.Element => {
	useSignals();
	const dataSignal = signal([10, 20, 30, 40, 50]);

	// This should trigger a warning - signal.value.map() in arrow function
	return (
		<div>
			{dataSignal.value.map((value, index) => (
				<span key={index} className="data-item">
					{value}
				</span>
			))}
		</div>
	);
};

// Component with signal.value.map() and filter chain
export function TestSignalMapWithChaining(): JSX.Element {
	useSignals();

	const numbersSignal = signal([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

	// This should trigger a warning - signal.value.map() with method chaining
	return (
		<div>
			{numbersSignal.value
				.filter((num) => num % 2 === 0)
				.map((evenNum, index) => (
					<span key={index}>{evenNum}</span>
				))}
		</div>
	);
}

// Component with signal.value.map() in conditional rendering
export function TestSignalMapInConditional(): JSX.Element {
	useSignals();
	const itemsSignal = signal<string[]>([]);
	const showItemsSignal = signal(true);

	// This should trigger a warning - signal.value.map() in conditional
	return (
		<div>
			{showItemsSignal.value ? (
				<ul>
					{itemsSignal.value.map((item, index) => (
						<li key={index}>{item}</li>
					))}
				</ul>
			) : null}
		</div>
	);
}

// Component with multiple signal.value.map() calls
export function TestMultipleSignalMaps(): JSX.Element {
	useSignals();
	const fruitsSignal = signal(["apple", "banana"]);
	const vegetablesSignal = signal(["carrot", "broccoli"]);

	// These should trigger warnings - multiple signal.value.map() calls
	return (
		<div>
			<h3>Fruits:</h3>

			<ul>
				{fruitsSignal.value.map((fruit, index) => (
					<li key={index}>{fruit}</li>
				))}
			</ul>

			<h3>Vegetables:</h3>

			<ul>
				{vegetablesSignal.value.map((vegetable, index) => (
					<li key={index}>{vegetable}</li>
				))}
			</ul>
		</div>
	);
}
