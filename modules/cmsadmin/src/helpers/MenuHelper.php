<?php

namespace cmsadmin\helpers;

use Yii;
use admin\models\Lang;
use yii\db\Query;
use cmsadmin\models\Nav;
use admin\models\Group;

/**
 * Menu Helper to collect Data used in Administration areas.
 * 
 * @author Basil Suter <basil@nadar.io>
 * @since 1.0.0-beta8
 */
class MenuHelper
{
    private static $items = null;
    
    /**
     * Get all nav data entries with corresponding item content
     * 
     * @return array
     */
    public static function getItems()
    {
        if (self::$items === null) {
            $items = (new Query())
            ->select(['cms_nav.id', 'nav_item_id' => 'cms_nav_item.id', 'nav_container_id', 'parent_nav_id', 'is_hidden', 'is_offline', 'is_draft', 'is_home', 'cms_nav_item.title'])
            ->from('cms_nav')
            ->leftJoin('cms_nav_item', 'cms_nav.id=cms_nav_item.nav_id')
            ->orderBy(['sort_index' => SORT_ASC])
            ->where(['cms_nav_item.lang_id' => Lang::getDefault()['id'], 'cms_nav.is_deleted' => 0, 'cms_nav.is_draft' => 0])
            ->all();
            
            self::items(0);
            
            $data = [];
            
            foreach ($items as $key => $item) {
                $item['is_editable'] = (int) Yii::$app->adminuser->canRoute('cmsadmin/page/update');
                
                // the user have "page edit" permission, now we can check if the this group has more fined tuned permisionss from the 
                // cms_nav_permissions table or not
                if ($item['is_editable']) {
                    $permitted = false;
                    
                    foreach (Yii::$app->adminuser->identity->groups as $group) {
                        if ($permitted) {
                            continue;
                        }
                        
                        $permitted = self::navGroupPermission($item['id'], $group->id);
                    }

                    if (!$permitted) {
                        $value = (isset(self::$data[$item['id']])) ? self::$data[$item['id']] : false;
                        
                        if ($value) {
                            $permitted = true;
                        }
                    }
                    
                    $item['is_editable'] = $permitted;
                }
            
                $data[$key] = $item;
            }
            
            self::$items = $data;
        }
        
        return self::$items;
    }
    
    private static $data = [];
    
    public static function items($parentNavId = 0, $fromInheritNode = false)
    {
        $items = Nav::find()->where(['parent_nav_id' => $parentNavId, 'is_deleted' => 0])->all();
        
        foreach ($items as $item) {
            if (!array_key_exists($item->id, self::$data)) {
                self::$data[] = $fromInheritNode;
            }
            
            foreach (Yii::$app->adminuser->identity->groups as $group) {
                if ($fromInheritNode) {
                    continue;
                }
                
                $fromInheritNode = self::navGroupInheritanceNode($item->id, $group);
            }
            
            self::items($item->id, $fromInheritNode);
        }
    }
    
    public static function navGroupInheritanceNode($navId, Group $group)
    {
        $definition = (new Query())->select("*")->from("cms_nav_permission")->where(['group_id' => $group->id, 'nav_id' => $navId])->one();
        
        if ($definition) {
            return (bool) $definition['inheritance'];
        }
        
        return false;
    }
    
    public static function navGroupPermission($navId, $groupId)
    {
        $definitions = (new Query())->select("*")->from("cms_nav_permission")->where(['group_id' => $groupId])->all();
        
        // the group has no permission defined, this means he can access ALL cms pages
        if (count($definitions) == 0) {
            return true;
        }
        
        foreach ($definitions as $permission) {
            if ($navId == $permission['nav_id']) {
                return true;
            }
        }
        
        return false;
    }
    
    private static $containers = null;
    
    /**
     * Get all cms containers
     * 
     * @return array
     */
    public static function getContainers()
    {
        if (self::$containers === null) {
            self::$containers = (new Query())->select(['id', 'name'])->from('cms_nav_container')->where(['is_deleted' => 0])->indexBy('id')->orderBy(['cms_nav_container.id' => 'ASC'])->all();
        }
        
        return self::$containers;
    }
    
    private static $drafts = null;
    
    /**
     * Get all drafts nav items
     * 
     * @return array
     */
    public static function getDrafts()
    {
        if (self::$drafts === null) {
            self::$drafts = (new Query())
            ->select(['cms_nav.id', 'nav_container_id', 'parent_nav_id', 'is_hidden', 'is_offline', 'is_draft', 'is_home', 'cms_nav_item.title'])
            ->from('cms_nav')
            ->leftJoin('cms_nav_item', 'cms_nav.id=cms_nav_item.nav_id')
            ->orderBy('cms_nav.sort_index ASC')
            ->where(['cms_nav_item.lang_id' => Lang::getDefault()['id'], 'cms_nav.is_deleted' => 0, 'cms_nav.is_draft' => 1])
            ->all();
        }
        
        return self::$drafts;
    }
}
