/**
 * @jsx React.DOM
 */
/*jshint quotmark:false */
/*jshint white:false */
/*jshint trailing:false */
/*jshint newcap:false */
/*global Utils, ALL_TODOS, ACTIVE_TODOS, COMPLETED_TODOS,
	TodoItem, TodoFooter, React, Router*/

(function (window, React) {
	'use strict';

	window.ALL_TODOS = 'all';
	window.ACTIVE_TODOS = 'active';
	window.COMPLETED_TODOS = 'completed';

	var ENTER_KEY = 13;

	// An example generic Mixin that you can add to any component that should
	// react to changes in a Backbone component. The use cases we've identified
	// thus far are for Collections -- since they trigger a change event whenever
	// any of their constituent items are changed there's no need to reconcile for
	// regular models. One caveat: this relies on getBackboneCollections() to
	// always return the same collection instances throughout the lifecycle of the
	// component. If you're using this mixin correctly (it should be near the top
	// of your component hierarchy) this should not be an issue.
	var BackboneMixin = {
		componentDidMount: function () {
			// Whenever there may be a change in the Backbone data, trigger a
			// reconcile.
			this.getBackboneCollections().forEach(function (collection, i) {
				collection.on('add remove change', this.forceUpdate.bind(this, null));
			}, this);
		},

		componentWillUnmount: function () {
			// Ensure that we clean up any dangling references when the component is
			// destroyed.
			this.getBackboneCollections().forEach(function (collection) {
				collection.off(null, null, this);
			}, this);
		}
	};

	var TodoApp = React.createClass({
		mixins: [BackboneMixin],
		getBackboneCollections: function () {
			return [this.props.todos];
		},

		getInitialState: function () {
			return {editing: null};
		},

		componentDidMount: function () {
			var Router = Backbone.Router.extend({
				routes: {
					'': 'all',
					'active': 'active',
					'completed': 'completed'
				},
				all: this.setState.bind(this, {nowShowing: ALL_TODOS}),
				active: this.setState.bind(this, {nowShowing: ACTIVE_TODOS}),
				completed: this.setState.bind(this, {nowShowing: COMPLETED_TODOS})
			});

			var router = new Router();
			Backbone.history.start();

			this.props.todos.fetch();
			this.refs.newField.getDOMNode().focus();
		},

		componentDidUpdate: function () {
			// If saving were expensive we'd listen for mutation events on Backbone and
			// do this manually. however, since saving isn't expensive this is an
			// elegant way to keep it reactively up-to-date.
			this.props.todos.forEach(function (todo) {
				todo.save();
			});
		},

		handleNewTodoKeyDown: function (event) {
			if (event.which !== ENTER_KEY) {
				return;
			}

			var val = this.refs.newField.getDOMNode().value.trim();
			if (val) {
				this.props.todos.create({
					title: val,
					completed: false,
					order: this.props.todos.nextOrder()
				});
				this.refs.newField.getDOMNode().value = '';
			}

			return false;
		},

		toggleAll: function (event) {
			var checked = event.target.checked;
			this.props.todos.forEach(function (todo) {
				todo.set('completed', checked);
			});
		},

		edit: function (todo, callback) {
			// refer to todoItem.jsx `handleEdit` for the reason behind the callback
			this.setState({editing: todo.get('id')}, callback);
		},

		save: function (todo, text) {
			todo.save({'title': text});
			this.setState({editing: null});
		},

		cancel: function () {
			this.setState({editing: null});
		},

		clearCompleted: function () {
			this.props.todos.completed().forEach(function (todo) {
				todo.destroy();
			});
		},

		render: function () {
			var footer = null;
			var main = null;
			var todos = this.props.todos;

			var shownTodos = todos.filter(function (todo) {
				switch (this.state.nowShowing) {
				case ACTIVE_TODOS:
					return !todo.get('completed');
				case COMPLETED_TODOS:
					return todo.get('completed');
				default:
					return true;
				}
			}, this);

			var todoItems = shownTodos.map(function (todo) {
				return (
					<TodoItem
						key={todo.get('id')}
						todo={todo}
						onToggle={todo.toggle.bind(todo)}
						onDestroy={todo.destroy.bind(todo)}
						onEdit={this.edit.bind(this, todo)}
						editing={this.state.editing === todo.get('id')}
						onSave={this.save.bind(this, todo)}
						onCancel={this.cancel}
					/>
				);
			}, this);

			var activeTodoCount = todos.reduce(function (accum, todo) {
				return todo.get('completed') ? accum : accum + 1;
			}, 0);

			var completedCount = todos.length - activeTodoCount;

			if (activeTodoCount || completedCount) {
				footer =
					<TodoFooter
						count={activeTodoCount}
						completedCount={completedCount}
						nowShowing={this.state.nowShowing}
						onClearCompleted={this.clearCompleted}
					/>;
			}

			if (todos.length) {
				main = (
					<section id="main">
						<input
							id="toggle-all"
							type="checkbox"
							onChange={this.toggleAll}
							checked={activeTodoCount === 0}
						/>
						<ul id="todo-list">
							{todoItems}
						</ul>
					</section>
				);
			}

			return (
				<div>
					<header id="header">
						<h1>todos</h1>
						<input
							ref="newField"
							id="new-todo"
							placeholder="What needs to be done?"
							onKeyDown={this.handleNewTodoKeyDown}
						/>
					</header>
					{main}
					{footer}
				</div>
			);
		}
	});

	React.renderComponent(
		<TodoApp todos={new Todos()} />,
		document.getElementById('todoapp')
	);

	React.renderComponent(
		<div>
			<p>Double-click to edit a todo</p>
			<p>Created by{' '}
				<a href="http://github.com/petehunt/">petehunt</a>
			</p>
			<p>Part of{' '}<a href="http://todomvc.com">TodoMVC</a></p>
		</div>,
		document.getElementById('info'));
})(window, React);
