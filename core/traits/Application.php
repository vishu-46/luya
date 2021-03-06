<?php

namespace luya\traits;

use Yii;

/**
 * LUYA Appliation trait
 * 
 * @property string $webroot returns the webroot directory event for console commands.
 * @property \luya\components\Mail $mail Get luya mail component
 * @author nadar
 */
trait Application
{
    private $_webroot = null;
    
    /**
     * @var string Title for the application used in different sections like Login screen
     */
    public $siteTitle = 'Luya';

    /**
     * @var string The internal used language to translate luya message, this is also used for all luya
     * core modules. Currently available languages
     *
     * + en
     * + de
     *
     * @since 1.0.0-beta2
     */
    public $luyaLanguage = 'en';
    
    /**
     * @var string|boolean Set a token, which will be used to collect data from a central host, if you want to enable this feature.
     * Use http://passwordsgenerator.net/ to create complex strings. When you have enabled this feature you can collect information's from
     * all your hosts with `example.com/admin/remote?token=Sha1EncodedRemoteToken`.
     */
    public $remoteToken = false;

    /**
     * @var string The directory where your webroot represents, this is basically used to find the webroot directory
     * in the console mode, cause some importer classes need those variables.
     */
    public $webrootDirectory = 'public_html';
    
    /**
     * Add trace info to luya application trait
     */
    public function init()
    {
        // call parent
        parent::init();
        // add trace info
        Yii::trace('initialize LUYA Application', __METHOD__);
    }
    
    /**
     * Read only property which is used in cli bootstrap process to set the @webroot alias
     * 
     * ```
     * Yii::setAlias('@webroot', $app->webroot);
     * ```
     */
    public function getWebroot()
    {
        if ($this->_webroot === null) {
            $this->_webroot = realpath(realpath($this->basePath) . DIRECTORY_SEPARATOR . $this->webrootDirectory);
        }
        
        return $this->_webroot;
    }

    /**
     * Add additional core components to the yii2 base core components.
     */
    public function luyaCoreComponents()
    {
        return array_merge(parent::coreComponents(), [
            'mail' => ['class' => 'luya\components\Mail'],
        ]);
    }

    /**
     * @return array Containing all module objects which are coreModules and instance of luya\base\Module.
     */
    public function getApplicationModules()
    {
        $modules = [];

        foreach ($this->getModules() as $id => $obj) {
            if ($obj instanceof \luya\base\Module && $obj->isCoreModule) {
                $modules[$id] = $obj;
            }
        }

        return $modules;
    }

    /**
     * Return a list with all registered frontend modules except 'luya' and 'cms'. This is needed in the module block.
     *
     * @return array
     */
    public function getFrontendModules()
    {
        $modules = [];

        foreach ($this->getModules() as $id => $obj) {
            if ($obj instanceof \luya\base\Module && !$obj->isAdmin && $id !== 'luya' && $id !== 'cms') {
                $modules[$id] = $obj;
            }
        }

        return $modules;
    }
}
