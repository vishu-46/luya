<?php

namespace admintests\admin\ngrest;

use admintests\AdminTestCase;

class ConfigTest extends AdminTestCase
{
    /**
     * @expectedException Exception
     */
    public function testSetConfigException()
    {
        $cfg = new \admin\ngrest\Config(['apiEndpoint' => 'rest-url', 'primaryKey' => 'id']);
        $cfg->setConfig(['foo' => 'bar']);
        $cfg->setConfig(['not' => 'valid']); // will throw exception: Cant set config if config is not empty
    }

    public function testAddFieldIfExists()
    {
        $cfg = new \admin\ngrest\Config(['apiEndpoint' => 'rest-url', 'primaryKey' => 'id']);
        $this->assertEquals(true, $cfg->addField('list', 'foo'));
        $this->assertEquals(false, $cfg->addField('list', 'foo'));
    }
}
