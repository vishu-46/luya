(function() {
	"use strict";
	
	// directive.js
	zaa.directive("createForm", function() {
		return {
			restrict : 'EA',
			scope : {
				data : '='
			},
			templateUrl : 'createform.html',
			controller : function($scope, $http, AdminLangService, MenuService, Slug) {
				
				$scope.error = [];
				$scope.success = false;
				
				$scope.controller = $scope.$parent;
				
				$scope.AdminLangService = AdminLangService;
				
				$scope.MenuService = MenuService;
				
				$scope.lang = $scope.AdminLangService.data;
				
				$scope.cat = $scope.MenuService.cats;
				
				$scope.data.nav_item_type = 1;
				$scope.data.parent_nav_id = 0;
				
				$http.get('admin/api-cms-defaults/cat').success(function(response) {
					$scope.data.cat_id = parseInt(response.id);
				});
				
				$http.get('admin/api-admin-defaults/lang').success(function(response) {
					$scope.data.lang_id = response.id;
				});
				
				$scope.navitems = [];
				
				$scope.$watch(function() { return $scope.data.cat_id }, function(n, o) {
					if (n !== undefined && n !== o) {
						$scope.data.parent_nav_id = 0;
						$scope.navitems = MenuService.menu[n]['__items'];
					}
				});
				
				$scope.rewriteSuggestion = function() {
					$scope.data.rewrite = Slug.slugify($scope.data.title);
				}
				
				$scope.exec = function () {
					$scope.controller.save().then(function(response) {
						MenuService.refresh();
						$scope.success = true;
						$scope.error = [];
						$scope.data.title = null;
						$scope.data.rewrite = null;
						if ($scope.data.isInline) {
							$scope.$parent.$parent.getItem($scope.data.lang_id, $scope.data.nav_id); /* getItem(nav_id, lang_id); */
						}
						
					}, function(reason) {
						$scope.error = reason;
					});
				}
			}
		}
	});
	
	zaa.directive("createFormPage", function(CmsLayoutService) {
		return {
			restrict : 'EA',
			scope : {
				data : '='
			},
			templateUrl : 'createformpage.html',
			controller : function($scope, $resource) {
				CmsLayoutService.data.$promise.then(function(response) {
					$scope.layouts = response;
				});
				$scope.save = function() {
					
					$scope.$parent.exec();
					/*
					ApiCmsNavItemPage.save($.param({ layout_id : $scope.data.layout_id }), function(response) {
						$scope.data.nav_item_type_id = response.id;
						$scope.$parent.exec();
					}, function(error) {
						console.log('err_create_form_page', error.data);
					});
					*/
				}
			}
		}
	});
	
	zaa.directive("createFormModule", function() {
		return {
			restrict : 'EA',
			scope : {
				data : '='
			},
			templateUrl : 'createformmodule.html',
			controller : function($scope) {
				
				$scope.save = function() {
					
					$scope.$parent.exec();
					
					/*
					ApiCmsNavItemModule.save($.param({ module_name : $scope.data.module_name }), function(response) {
						$scope.data.nav_item_type_id = response.id;
						$scope.$parent.exec();
					});
					*/
				}
			}
		}
	});
	
	// factory.js
	
	zaa.factory('ApiCmsCat', function($resource) {
		return $resource('admin/api-cms-cat/:id');
	});
	
	zaa.factory('ApiCmsBlock', function($resource) {
		return $resource('admin/api-cms-block/:id');
	});
	
	zaa.factory('CmsLayoutService', function($resource) {
		var service = [];
		
		service.data = [];
		
		service.resource = $resource('admin/api-cms-layout/:id');
		
		service.load = function() {
			service.data = service.resource.query();
		}
		
		return service;
	});
	
	zaa.factory('ApiCmsNavItemPageBlockItem', function($resource) {
		return $resource('admin/api-cms-navitempageblockitem/:id', { id : '@_id' }, {
			save : {
				method : 'POST',
				isArray : false,
				headers: {'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'}
			},
			update : {
				method : 'PUT',
				isArray : false,
				headers: {'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'}
			},
			'delete' : {
				method : 'DELETE'
			}
		});
	});
	
	zaa.factory('PlaceholderService', function() {
		var service = [];
		
		service.status = 1; /* 1 = showplaceholders; 0 = hide placeholders */
		
		service.delegate = function(status) {
			service.status = status;
		}
		
		return service;
	})
	
	zaa.factory('DroppableBlocksService', function($http) {
		var service = [];
		
		service.blocks = [];
		
		service.load = function() {
			if (service.blocks.length == 0) { /* do not reload block data if there is already. what about force reload? */
				$http({
					url : 'admin/api-cms-admin/get-all-blocks',
					method : 'GET'
				}).success(function(response) {
					service.blocks = response;
				});
			}
		};
		
		return service;
	});
	
	// layout.js
	
	zaa.config(function($stateProvider) {
		$stateProvider
		.state("custom.cmsedit", {
			url : "/update/:navId",
			templateUrl : 'cmsadmin/page/update'
		})
		.state("custom.cmsadd", {
			url : "/create",
			templateUrl : 'cmsadmin/page/create'
		});
	});
	
	zaa.service('MenuService', function($http) {
		var service = [];
		
		service.menu = [];
		
		service.cats = [];
		
		service.refresh = function() {
			service.cats = [];
			$http.get('admin/api-cms-menu/all').success(function(response) {
				for (var i in response) {
					service.cats.push({ name : response[i]['name'], id : parseInt(response[i]['id'])});
				}
				service.menu = response;
			});
		}
		
		service.refresh();
		
		return service;
	});
	
	zaa.controller("DropNavController", function($scope, $http, MenuService) {
		
		$scope.droppedNavItem = null;
		
	    $scope.onBeforeDrop = function($event, $ui) {
	    	var itemid = $($event.target).data('itemid');
			//console.log('dropped block beofre itemid: ' + itemid, 'theblock', $scope.droppedNavItem);
			$http.get('admin/api-cms-navitem/move-before', { params : { moveItemId : $scope.droppedNavItem.id, droppedBeforeItemId : itemid }}).success(function(r) {
				MenuService.refresh();
			}).error(function(r) {
				console.log('err', r)
			})
	    }
	    
	    $scope.onAfterDrop = function($event, $ui) {
	    	var itemid = $($event.target).data('itemid');
			//console.log('dropped block beofre itemid: ' + itemid, 'theblock', $scope.droppedNavItem);
			$http.get('admin/api-cms-navitem/move-after', { params : { moveItemId : $scope.droppedNavItem.id, droppedAfterItemId : itemid }}).success(function(r) {
				MenuService.refresh();
			}).error(function(r) {
				console.log('err', r)
			})
	    }
	    
	    $scope.onChildDrop = function($event, $ui) {
	    	var itemid = $($event.target).data('itemid');
			//console.log('dropped block beofre itemid: ' + itemid, 'theblock', $scope.droppedNavItem);
			$http.get('admin/api-cms-navitem/move-to-child', { params : { moveItemId : $scope.droppedNavItem.id, droppedOnItemId : itemid }}).success(function(r) {
				MenuService.refresh();
			}).error(function(r) {
				console.log('err', r)
			})
	    }
	})
	
	zaa.controller("CmsMenuTreeController", function($scope, $state, MenuService, DroppableBlocksService, AdminLangService, CmsLayoutService) {
	    
		CmsLayoutService.load();
		
		$scope.AdminLangService = AdminLangService;
		
		$scope.AdminLangService.load(true);
		
		$scope.menu = [];
		
		$scope.showDrag = false;
		
		$scope.toggleDrag = function() {
			$scope.showDrag = !$scope.showDrag;
		}
		
		DroppableBlocksService.load();
		
	    $scope.$watch(function() { return MenuService.menu }, function(newValue) {
	    	$scope.menu = newValue;
	    });
	    
	    $scope.isCurrentElement = function(navId) {
	    	if ($state.params.navId == navId) {
	    		return true;
	    	}
	    	
	    	return false;
	    }
	    
	    $scope.go = function(navId) {
	    	$state.go('custom.cmsedit', { navId : navId });
	    };
	    
	    /* drag & drop integration */
	    
	    $scope.onStart = function() {
		};
		
		$scope.onStop = function() {
		};
	});
	
	// create.js
	
	zaa.controller("CmsadminCreateController", function($scope, $q, $http) {
		
		$scope.data = {};
		$scope.data.isInline = false;
		
		$scope.save = function() {
			
			var headers = {"headers" : { "Content-Type" : "application/x-www-form-urlencoded; charset=UTF-8" }};
			
			return $q(function(resolve, reject) {
				
				if ($scope.data.nav_item_type == 1) {
					$http.post('admin/api-cms-nav/create-page', $.param($scope.data), headers).success(function(response) {
						resolve(response);
					}).error(function(response) {
						reject(response);
					});
				}
				
				if ($scope.data.nav_item_type == 2) {
					$http.post('admin/api-cms-nav/create-module', $.param($scope.data), headers).success(function(response) {
						resolve(response);
					}).error(function(response) {
						reject(response);
					});
				}
			});
		}
	});
	
	zaa.controller("CmsadminCreateInlineController", function($scope, $q, $http) {
		
		$scope.data = {
			nav_id : $scope.$parent.NavController.id
		};
		
		$scope.data.isInline = true;
		
		$scope.save = function() {
		
			$scope.data.lang_id = $scope.lang.id;
			
			var headers = {"headers" : { "Content-Type" : "application/x-www-form-urlencoded; charset=UTF-8" }};
			
			return $q(function(resolve, reject) {
				
				if ($scope.data.nav_item_type == 1) {
					$http.post('admin/api-cms-nav/create-page-item', $.param($scope.data), headers).success(function(response) {
						resolve(response);
					}).error(function(response) {
						reject(response);
					});
				}
				
				if ($scope.data.nav_item_type == 2) {
					$http.post('admin/api-cms-nav/create-module-item', $.param($scope.data), headers).success(function(response) {
						resolve(response);
					}).error(function(response) {
						reject(response);
					});
				}
			})
		}
		
	});
	
	// update.js
	
	zaa.controller("NavController", function($scope, $stateParams, $http, AdminLangService, AdminClassService, MenuService, PlaceholderService) {
		
		$scope.id = parseInt($stateParams.navId);
		
		$scope.isDeleted = false;
		
		$scope.menuCats = MenuService.cats;
		
		$scope.PlaceholderService = PlaceholderService;
		
		$scope.placeholderState = $scope.PlaceholderService.status;
		
		$scope.$watch('placeholderState', function(n, o) {
			if (n !== o && n !== undefined) {
				$scope.PlaceholderService.delegate(n);
			}
		});
		
		$scope.navData = {};
	
	    $scope.sidebar = false;
		
	    $scope.enableSidebar = function() {
	    	$scope.sidebar = true;
	    }
	    
	    $scope.toggleSidebar = function() {
	        $scope.sidebar = !$scope.sidebar;
	    };
	    
		$http.get('admin/api-cms-nav/detail', { params : { navId : $scope.id }}).success(function(response) {
			$scope.navData = response;
		});
		
		$scope.$watch(function() { return $scope.navData.is_hidden }, function(n, o) {
			if (o !== undefined) {
				$http.get('admin/api-cms-nav/toggle-hidden', { params : { navId : $scope.navData.id , hiddenStatus : n }}).success(function(response) {
					MenuService.refresh();
					// send toast
					if (n == 1) {
						Materialize.toast('<span>Die Seite ist nun Unsichtbar.</span>', 2000)
					} else {
						Materialize.toast('<span>Die Seite ist nun Sichtbar.</span>', 2000)
					}
				});
			}
		});
		
		$scope.$watch(function() { return $scope.navData.cat_id }, function(n, o) {
			if (o != undefined && o != null && n != o) {
				$http.get('admin/api-cms-nav/update-cat', { params : { navId : $scope.navData.id , catId : n }}).success(function(response) {
					MenuService.refresh();
					Materialize.toast('<span>Die Seite wurde der Navigation ' + n + ' zugewiesen.</span>', 2000)
				});
				
			}
		});
		
	    $scope.trash = function() {
	    	if (confirm('your are sure you want to delete this page?')) {
	    		$http.get('admin/api-cms-nav/delete', { params : { navId : $scope.navData.id }}).success(function(response) {
	    			MenuService.refresh();
	    			$scope.isDeleted = true;
	    		});
	    	}
	    };
		
		$scope.AdminClassService = AdminClassService;
		
		$scope.AdminLangService = AdminLangService;
		
		$scope.refresh = function() {
			$scope.langs = $scope.AdminLangService.data;
		}
		
		$scope.refresh();
	});
	
	/**
	 * @param $scope.lang
	 *            from ng-repeat
	 */
	zaa.controller("NavItemController", function($scope, $http, $timeout, MenuService, CmsLayoutService) {
		
		$scope.NavController = $scope.$parent;
		
		$scope.showContainer = false;
		
		$scope.isTranslated = false;
		
		$scope.item = [];
		
		$scope.itemCopy = [];
	
		$scope.settings = false;
		
		$scope.reset = function() {
			$scope.itemCopy = angular.copy($scope.item);
			$scope.typeDataCopy = angular.copy($scope.typeData);
		}
		
		$scope.save = function(itemCopy, typeDataCopy) {
			var headers = {"headers" : { "Content-Type" : "application/x-www-form-urlencoded; charset=UTF-8" }};
			var navItemId = itemCopy.id;
			$http.post('admin/api-cms-navitem/update-item?navItemId=' + navItemId, $.param({ title : itemCopy.title, rewrite : itemCopy.rewrite }), headers).success(function(response) {
				$http.post('admin/api-cms-navitem/update-item-type-data?navItemId=' + navItemId, $.param(typeDataCopy), headers).success(function(responseTypeData) {
					Materialize.toast('<span> Die Seite «'+itemCopy.title+'» wurde aktualisiert.</span>', 2000);
					MenuService.refresh();
					$scope.refresh();
					$scope.toggleSettings();
					
				});
			}).error(function(e) {
				console.log(e);
			})
		};
		
		$scope.toggleSettings = function() {
			$scope.reset();
			$scope.settings = !$scope.settings;
		};
	
		
		CmsLayoutService.data.$promise.then(function(response) {
			$scope.layouts = response;
		})
		
		$scope.typeDataCopy = [];
		
		$scope.typeData = [];
		
		$scope.getItem = function(langId, navId) {
			$scope.showContainer = false;
			$http({
			    url: 'admin/api-cms-navitem/nav-lang-item', 
			    method: "GET",
			    params: { langId : langId, navId : navId }
			}).success(function(response) {
				if (response) {
					$scope.item = response;
					
					$http({
						url : 'admin/api-cms-navitem/type-data',
						method : 'get',
						params : { navItemId : response.id }
					}).success(function(r) {
						$scope.typeData = r;
					})
					
					$scope.isTranslated = true;
					
					$timeout(function() {
						$scope.showContainer = true;
						$scope.$broadcast('refreshItems');
					}, 500);
				} else {
					$timeout(function() {
						$scope.showContainer = true;
						$scope.$broadcast('refreshItems');
					}, 500);
				}
				
				$scope.reset();
				
			});
		}
		
		$scope.refresh = function() {
			$scope.getItem($scope.lang.id, $scope.NavController.id);
		}
		
		$scope.refresh();
		
	});
	
	zaa.controller("NavItemTypePageController", function($scope, $http, $timeout) {
		
		$scope.NavItemController = $scope.$parent;
		
		$scope.container = [];
		
		$scope.$on('refreshItems', function(event) { 
			$scope.refresh(true);
		});
		
		$scope.refresh = function(forceReload) {
			$http({
				url : 'admin/api-cms-navitem/tree',
				method : 'GET',
				params : { navItemPageId : $scope.NavItemController.item.nav_item_type_id }
			}).success(function(response) {
				if ($scope.container.length == 0 || forceReload === true) {
					$scope.container = response;
				} else {
					// merge new content item to placeholder
					var old_ph = $scope.container.__placeholders;
					var new_ph = response.__placeholders;
					for (var i in old_ph) {
						$scope.container.__placeholders[i]['__nav_item_page_block_items'] = new_ph[i]['__nav_item_page_block_items'];
					}
				}
				$timeout(function() {
					$scope.$parent.$parent.$parent.enableSidebar();
				}, 100);
				/*
	
	            for (var i in $scope.container.__placeholders) {
	                $scope.container.__placeholders[i]['open'] = false;
	            }
	            */
			});
		};
		
		$scope.refreshNested = function(prevId, placeholderVar) {
			
			$http({
				url : 'admin/api-cms-navitem/reload-placeholder',
				method : 'GET',
				params : { navItemPageId : $scope.NavItemController.item.nav_item_type_id, prevId : prevId, placeholderVar : placeholderVar}
			}).success(function(response) {
				for (var i in $scope.container.__placeholders) {
					var out = $scope.revPlaceholders($scope.container.__placeholders[i], prevId, placeholderVar, response);
					if (out !== false ) {
						return;
					}
				}
				
			});
		}
		$scope.revPlaceholders = function(placeholder, prevId, placeholderVar, replaceContent) {
			var tmp = placeholder['prev_id'];
			if (parseInt(prevId) == parseInt(tmp) && placeholderVar == placeholder['var']) {
				placeholder['__nav_item_page_block_items'] = replaceContent;
				return true;
			}
			
			var find = $scope.revFind(placeholder, prevId, placeholderVar, replaceContent)
			if (find !== false) {
				return find;
			}
			return false;
		}
		
		$scope.revFind = function(placeholder, prevId, placeholderVar, replaceContent) {
			for (var i in placeholder['__nav_item_page_block_items']) {
				for (var holder in placeholder['__nav_item_page_block_items'][i]['__placeholders']) {
					var rsp = $scope.revPlaceholders(placeholder['__nav_item_page_block_items'][i]['__placeholders'][holder], prevId, placeholderVar, replaceContent);
					if (rsp !== false) {
						return rsp;
					}
				}
			}
			return false;
		}
		
	});
	
	/**
	 * @param $scope.placeholder
	 *            from ng-repeat
	 */
	zaa.controller("PagePlaceholderController", function($scope, AdminClassService, PlaceholderService) {
		
		$scope.NavItemTypePageController = $scope.$parent;
		
		$scope.PlaceholderService = PlaceholderService;
		
		$scope.$watch(function() { return $scope.PlaceholderService.status }, function(n,o) {
			if (n) {
				$scope.isOpen = true;
			} else {
				$scope.isOpen = false;
			}
		});
		
		$scope.isOpen = false;
		
		$scope.toggleOpen = function() {
			$scope.isOpen = !$scope.isOpen;
		}
		
		$scope.mouseEnter = function() {
			var status = AdminClassService.getClassSpace('onDragStart');
			if (status !== undefined && !$scope.isOpen) {
				$scope.isOpen = true;
			}
		};
	});
	
	
	/**
	 * @param $scope.block
	 *            from ng-repeat
	 */
	zaa.controller("PageBlockEditController", function($scope, $sce, $http, ApiCmsNavItemPageBlockItem, AdminClassService) {
	
		$scope.onStart = function() {
			$scope.$apply(function() {
				AdminClassService.setClassSpace('onDragStart', 'page--drag-active');
			});
		};
		
		
		$scope.isEditable = function() {
			if ($scope.block.vars.length > 0 || $scope.block.cfgs.length > 0) {
				return true;
			}
			
			return false;
		}
		
		$scope.safe = function(html) {
			return $sce.trustAsHtml(html);
		}
		
		$scope.onStop = function() {
			$scope.$apply(function() {
				AdminClassService.setClassSpace('onDragStart', undefined);
			});
		};
		
		$scope.$watch(function() { return $scope.block.values }, function(n, o) {
			$scope.data = n;
		});
		
		$scope.cfgdata = $scope.block.cfgvalues || {};
		
		$scope.PagePlaceholderController = $scope.$parent;
		
		$scope.edit = false;
		
		$scope.toggleEdit = function() {
			if (!$scope.isEditable()) {
				return;
			}
			/* onclick="$(this).parents('.block').toggleClass('block--edit');" */
			$scope.edit = !$scope.edit;
		};
		
		$scope.renderTemplate = function(template, dataVars, cfgVars, block, extras) {
			if (template == undefined) {
				return '';
			}
			var template = twig({
			    data: template
			});
			
			var content = template.render({
				vars : dataVars,
				cfgs : cfgVars,
				block : block,
				extras : extras
			});
			
			return $sce.trustAsHtml(content);
		};
		
		$scope.removeBlock = function(block) {
	        if (confirm('Block «' + block.name + '» wirklich löschen?')) {
	            ApiCmsNavItemPageBlockItem.delete({id: block.id}, function (rsp) {
	                $scope.PagePlaceholderController.NavItemTypePageController.refresh();
	                Materialize.toast('Block «' + block.name + '» wurde entfernt!', 3000);
	            });
	        }
		};
		
		$scope.save = function () {
			ApiCmsNavItemPageBlockItem.update({ id : $scope.block.id }, $.param({json_config_values : JSON.stringify($scope.data), json_config_cfg_values : JSON.stringify($scope.cfgdata) }), function(rsp) {
				Materialize.toast('<span> Block «'+$scope.block.name+'» wurde aktualisiert.</span>', 2000)
				$scope.edit = false;
				$scope.block.is_dirty = 1;
				
				$http({
				    url: 'admin/api-cms-navitem/get-block', 
				    method: "GET",
				    params: { blockId : $scope.block.id }
				}).success(function(rsp) {
					$scope.block = rsp;
				});
				
			});
		}
		
	});
	
	/**
	 * @TODO HANDLING SORT INDEX OF EACH BLOCK
	 */
	zaa.controller("DropBlockController", function($scope, ApiCmsNavItemPageBlockItem, AdminClassService) {
		
		$scope.PagePlaceholderController = $scope.$parent;
		
		$scope.droppedBlock = {};
		
		$scope.onDrop = function($event, $ui) {
			var sortIndex = $($event.target).data('sortindex');
			var moveBlock = $scope.droppedBlock['vars'] || false;
			if (moveBlock === false) {
				ApiCmsNavItemPageBlockItem.save($.param({ prev_id : $scope.placeholder.prev_id, sort_index : sortIndex, block_id : $scope.droppedBlock.id , placeholder_var : $scope.placeholder.var, nav_item_page_id : $scope.placeholder.nav_item_page_id }), function(rsp) {
					//console.log(rsp, $scope.placeholder.prev_id);
					$scope.PagePlaceholderController.NavItemTypePageController.refreshNested($scope.placeholder.prev_id, $scope.placeholder.var);
					//$scope.PagePlaceholderController.NavItemTypePageController.refresh();
					$scope.droppedBlock = {};
				})
			} else {
				ApiCmsNavItemPageBlockItem.update({ id : $scope.droppedBlock.id }, $.param({
					prev_id : $scope.placeholder.prev_id,
					placeholder_var : $scope.placeholder.var,
					sort_index : sortIndex
				}), function(rsp) {
					$scope.PagePlaceholderController.NavItemTypePageController.refreshNested($scope.placeholder.prev_id, $scope.placeholder.var);
					// console.log(rsp, $scope.placeholder.prev_id);
					//$scope.PagePlaceholderController.NavItemTypePageController.refresh();
					$scope.droppedBlock = {};
				});
			}
			AdminClassService.setClassSpace('onDragStart', undefined);
		}
	});
	
	zaa.controller("DroppableBlocksController", function($scope, $http, AdminClassService, DroppableBlocksService, $sce) {
	
		$scope.onStart = function() {
			$scope.$apply(function() {
				AdminClassService.setClassSpace('onDragStart', 'page--drag-active');
			});
		}
		
		$scope.safe = function(html) {
			return $sce.trustAsHtml(html);
		}
		
		$scope.onStop = function() {
			$scope.$apply(function() {
				AdminClassService.setClassSpace('onDragStart', undefined);
			});
		}
		
		$scope.DroppableBlocksService = DroppableBlocksService;
	});
	
})();